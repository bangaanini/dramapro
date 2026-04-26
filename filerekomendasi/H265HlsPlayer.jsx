import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { parseM3u8 } from '../utils/hlsParser';

const WORKER_POOL_SIZE = 4;
const CHUNK_DURATION_TARGET = 10;
const DOWNLOAD_CONCURRENCY = 6;

const isMT = () => typeof SharedArrayBuffer !== 'undefined';

async function loadFfmpeg() {
    const mt = isMT();
    const base = window.location.origin;
    const dir = mt ? '/ffmpeg-mt' : '/ffmpeg';

    const opts = {
        coreURL: await toBlobURL(`${base}${dir}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}${dir}/ffmpeg-core.wasm`, 'application/wasm'),
    };
    if (mt) {
        opts.workerURL = await toBlobURL(
            `${base}${dir}/ffmpeg-core.worker.js`, 'text/javascript'
        );
    }

    const ff = new FFmpeg();
    await ff.load(opts);
    return ff;
}

async function downloadSegments(segments, onProgress) {
    const results = new Array(segments.length);
    let completed = 0;
    let cursor = 0;

    const worker = async () => {
        while (cursor < segments.length) {
            const i = cursor++;
            if (i >= segments.length) break;
            const res = await fetch(segments[i].url, {
                signal: AbortSignal.timeout(30_000),
            });
            results[i] = new Uint8Array(await res.arrayBuffer());
            completed++;
            onProgress(Math.round((completed / segments.length) * 100));
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, segments.length) }, worker)
    );
    return results;
}

function detectMimeType() {
    const candidates = [
        'video/mp4; codecs="avc1.64001F,mp4a.40.2"',
        'video/mp4; codecs="avc1.4D401F,mp4a.40.2"',
        'video/mp4; codecs="avc1.42E01F,mp4a.40.2"',
        'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
        'video/mp4; codecs="avc1.42C01E,mp4a.40.2"',
    ];
    return candidates.find(m => MediaSource.isTypeSupported(m))
        ?? 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
}

function buildChunkGroups(segments) {
    const groups = [];
    let cur = [], dur = 0;
    for (let i = 0; i < segments.length; i++) {
        cur.push(i);
        dur += segments[i].duration ?? 0;
        if (dur >= CHUNK_DURATION_TARGET) {
            groups.push(cur);
            cur = []; dur = 0;
        }
    }
    if (cur.length) groups.push(cur);
    return groups;
}

function buildExecArgs(listName, outName) {
    return [
        '-f', 'concat',
        '-safe', '0',
        '-i', listName,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-ar', '44100',
        '-threads', '1',
        '-avoid_negative_ts', 'make_zero',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4',
        outName,
    ];
}

const H265HlsPlayer = forwardRef(function H265HlsPlayer(
    { src, onReady, onError, onTimeUpdate, onEnded, onPlay, onPause },
    ref
) {
    const totalDurationRef = useRef(0);
    const videoRef = useRef(null);
    const sourceBufferRef = useRef(null);
    const mediaSourceRef = useRef(null);
    const queueRef = useRef([]);
    const appendingRef = useRef(false);

    const [phase, setPhase] = useState('init');
    const [downloadPct, setDownloadPct] = useState(0);
    const [transcodePct, setTranscodePct] = useState(0);
    const [chunksDone, setChunksDone] = useState(0);
    const [totalChunks, setTotalChunks] = useState(0);
    const [mtEnabled, setMtEnabled] = useState(false);

    const hasStartedRef = useRef(false);
    const [hasStarted, setHasStarted] = useState(false);

    useImperativeHandle(ref, () => ({ video: () => videoRef.current }));

    function appendNext() {
        if (appendingRef.current) return;
        if (!queueRef.current.length) return;
        const sb = sourceBufferRef.current;
        if (!sb || sb.updating) return;
        appendingRef.current = true;
        sb.appendBuffer(queueRef.current.shift());
    }

    useEffect(() => {
        if (!src) return;
        let cancelled = false;
        const allFfmpegs = [];

        setPhase('init');
        setDownloadPct(0);
        setTranscodePct(0);
        setChunksDone(0);
        setTotalChunks(0);
        setHasStarted(false);
        setMtEnabled(isMT());
        hasStartedRef.current = false;
        queueRef.current = [];
        appendingRef.current = false;

        const run = async () => {
            try {
                setPhase('loading-ffmpeg');

                const [, m3u8Res] = await Promise.all([
                    loadFfmpeg().then(ff => { allFfmpegs.push(ff); return ff; }),
                    fetch(src, { signal: AbortSignal.timeout(10_000) }),
                ]);

                if (cancelled) return;

                const m3u8Text = await m3u8Res.text();
                const segments = parseM3u8(m3u8Text, src);
                if (!segments.length) throw new Error('Tidak ada segmen ditemukan');

                totalDurationRef.current = segments.reduce((s, x) => s + (x.duration ?? 0), 0);

                setPhase('downloading');

                const poolSize = Math.min(WORKER_POOL_SIZE, segments.length);
                const extraWorkerCount = Math.max(0, poolSize - 1);

                const [tsChunks, extraWorkers] = await Promise.all([
                    downloadSegments(segments, pct => {
                        if (!cancelled) setDownloadPct(pct);
                    }),
                    Promise.all(
                        Array.from({ length: extraWorkerCount }, () => loadFfmpeg())
                    ),
                ]);

                if (cancelled) {
                    extraWorkers.forEach(f => { try { f.terminate(); } catch { } });
                    return;
                }

                extraWorkers.forEach(f => allFfmpegs.push(f));
                const workerPool = allFfmpegs.slice();

                const ms = new MediaSource();
                mediaSourceRef.current = ms;
                videoRef.current.src = URL.createObjectURL(ms);
                await new Promise(r => ms.addEventListener('sourceopen', r, { once: true }));
                if (cancelled) return;

                const mimeType = detectMimeType();
                const sb = ms.addSourceBuffer(mimeType);
                sourceBufferRef.current = sb;
                sb.mode = 'sequence';

                const chunkGroups = buildChunkGroups(segments);
                const numChunks = chunkGroups.length;
                setTotalChunks(numChunks);

                let flushPointer = 0;
                const results = new Array(numChunks);
                let doneCount = 0;
                const chunkProgress = new Array(numChunks).fill(0);

                const updateProgress = () => {
                    const sum = chunkProgress.reduce((a, b) => a + b, 0);
                    setTranscodePct(Math.min(100, Math.round((sum / numChunks) * 100)));
                };

                const tryStartPlayback = () => {
                    if (hasStartedRef.current) return;
                    if (!videoRef.current?.buffered?.length) return;
                    hasStartedRef.current = true;
                    setHasStarted(true);
                    videoRef.current.play().catch(() => { });
                    onReady?.();
                };

                const flushReadyChunks = () => {
                    while (flushPointer < numChunks && results[flushPointer] !== undefined) {
                        queueRef.current.push(results[flushPointer]);
                        flushPointer++;
                    }
                    appendNext();
                    if (
                        flushPointer >= numChunks &&
                        !queueRef.current.length &&
                        !appendingRef.current
                    ) {
                        try { ms.endOfStream(); } catch { }
                        setPhase('done');
                        tryStartPlayback();
                    }
                };

                sb.addEventListener('updateend', () => {
                    appendingRef.current = false;
                    tryStartPlayback();
                    appendNext();
                    if (
                        flushPointer >= numChunks &&
                        !queueRef.current.length &&
                        !appendingRef.current
                    ) {
                        try { ms.endOfStream(); } catch { }
                        setPhase('done');
                        tryStartPlayback();
                    }
                });

                setPhase('transcoding');

                let nextIdx = 0;

                const transcodeChunk = async (ff, chunkIdx) => {
                    if (cancelled) return;
                    const group = chunkGroups[chunkIdx];
                    const listName = `list_${chunkIdx}.txt`;
                    const outName = `out_${chunkIdx}.mp4`;

                    const listLines = [];
                    for (const gi of group) {
                        const inName = `in_${chunkIdx}_${gi}.ts`;
                        await ff.writeFile(inName, tsChunks[gi]);
                        listLines.push(`file '${inName}'`);
                    }
                    await ff.writeFile(
                        listName,
                        new Uint8Array(new TextEncoder().encode(listLines.join('\n')))
                    );

                    try {
                        if (cancelled) return;

                        const onProg = ({ progress }) => {
                            if (progress >= 0 && progress <= 1) {
                                chunkProgress[chunkIdx] = progress;
                                updateProgress();
                            }
                        };
                        ff.on('progress', onProg);

                        await ff.exec(buildExecArgs(listName, outName));

                        ff.off('progress', onProg);
                        if (cancelled) return;

                        const out = await ff.readFile(outName);

                        if (!out || out.byteLength < 1000) {
                            throw new Error(
                                `Chunk ${chunkIdx} terlalu kecil: ${out?.byteLength ?? 0}B`
                            );
                        }

                        for (const gi of group) {
                            ff.deleteFile(`in_${chunkIdx}_${gi}.ts`).catch(() => { });
                        }
                        ff.deleteFile(listName).catch(() => { });
                        ff.deleteFile(outName).catch(() => { });

                        results[chunkIdx] = out.buffer.slice(
                            out.byteOffset, out.byteOffset + out.byteLength
                        );

                    } catch (err) {
                        if (!cancelled) {
                            console.warn(`[H265Player] chunk ${chunkIdx} error:`, err.message);
                        }
                        results[chunkIdx] = null;
                    }

                    chunkProgress[chunkIdx] = 1;
                    updateProgress();
                    doneCount++;
                    setChunksDone(doneCount);

                    if (results[chunkIdx] === null) {
                        results[chunkIdx] = new ArrayBuffer(0);
                    }

                    flushReadyChunks();
                };

                const workerLoop = async (ff) => {
                    while (!cancelled) {
                        const idx = nextIdx++;
                        if (idx >= numChunks) return;
                        await transcodeChunk(ff, idx);
                    }
                };

                await Promise.all(workerPool.map(ff => workerLoop(ff)));

                if (!cancelled) flushReadyChunks();

            } catch (err) {
                if (!cancelled) {
                    setPhase('error');
                    onError?.(err.message);
                    console.error('[H265Player] fatal:', err);
                }
            }
        };

        run();

        return () => {
            cancelled = true;
            allFfmpegs.forEach(ff => { try { ff.terminate(); } catch { } });
            try { mediaSourceRef.current?.endOfStream(); } catch { }
            if (videoRef.current) videoRef.current.src = '';
        };
    }, [src]);

    const phaseLabel = {
        init: '',
        'loading-ffmpeg': 'Loading decoder WASM…',
        'fetching-playlist': 'Fetching playlist…',
        downloading: `Downloading segmen… ${downloadPct}%`,
        transcoding: `Transcoding (${chunksDone}/${totalChunks} chunk)… ${transcodePct}%`,
        done: '',
        error: '',
    }[phase] ?? '';

    const showOverlay = !['done', 'init', 'error'].includes(phase) && !hasStarted;

    const barPct =
        phase === 'downloading' ? downloadPct
            : phase === 'transcoding' ? transcodePct
                : 0;

    const barColor =
        phase === 'downloading'
            ? 'linear-gradient(to right,#34D399,#10b981)'
            : 'linear-gradient(to right,#60A5FA,#3b82f6)';

    return (
        <div className="absolute inset-0 w-full h-full bg-black">
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                controls={false}
                playsInline
                onTimeUpdate={e => {
                    const d = totalDurationRef.current || e.target.duration;
                    onTimeUpdate?.(e.target.currentTime, d > 0 ? d : undefined);
                }}
                onEnded={onEnded}
                onPlay={onPlay}
                onPause={onPause}
            />

            {showOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 pointer-events-none">
                    <svg className="animate-spin w-10 h-10" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none"
                            stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                        <circle cx="20" cy="20" r="16" fill="none"
                            stroke="rgba(255,255,255,0.65)" strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 16 * 0.25} ${2 * Math.PI * 16 * 0.75}`}
                            transform="rotate(-90 20 20)"
                        />
                    </svg>

                    <p className="text-sm text-white/60 text-center px-6">{phaseLabel}</p>

                    {barPct > 0 && (
                        <div className="w-56 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-[width] duration-300"
                                style={{ width: `${barPct}%`, background: barColor }}
                            />
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-1">
                        {phase === 'transcoding' && (
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                {Math.min(WORKER_POOL_SIZE, totalChunks || 1)} Worker · {CHUNK_DURATION_TARGET}s/chunk
                            </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${mtEnabled ? 'text-green-400/50' : 'text-white/20'}`}>
                            {mtEnabled ? 'MT WASM · Multi-thread' : 'ST WASM · Single-thread'}
                        </span>
                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                            D5STUDIO - DECODER
                        </span>
                    </div>
                </div>
            )}

            {hasStarted && !['done', 'error', 'init'].includes(phase) && (
                <div className="absolute top-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl pointer-events-none shadow-xl shadow-black/40">
                    <svg className="animate-spin w-4 h-4 text-sky-400" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none"
                            stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                        <circle cx="20" cy="20" r="16" fill="none"
                            stroke="currentColor" strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 16 * 0.25} ${2 * Math.PI * 16 * 0.75}`}
                            transform="rotate(-90 20 20)"
                        />
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white font-bold leading-none mb-1.5">
                            Processing {chunksDone}/{totalChunks}
                        </span>
                        <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-sky-400 rounded-full transition-all duration-300"
                                style={{ width: `${barPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default H265HlsPlayer;