/**
 * Probe apakah stream HLS menggunakan H.265/HEVC
 */
export async function probeH265(m3u8Url) {
    try {
        console.log('[probeH265] Fetching manifest:', m3u8Url);
        const res = await fetch(m3u8Url, { signal: AbortSignal.timeout(8000) });
        const text = await res.text();

        const codecMatch = text.match(/CODECS="([^"]+)"/i);
        if (codecMatch) {
            const c = codecMatch[1].toLowerCase();
            const isH265 = c.includes('hev1') || c.includes('hvc1') || c.includes('h265');
            console.log('[probeH265] CODECS tag found:', codecMatch[1], '→', isH265 ? 'H.265' : 'non-H.265');
            return isH265;
        }

        console.log('[probeH265] No CODECS tag, probing first segment...');
        const segLine = text.split('\n').find(l => l.trim() && !l.startsWith('#'));
        if (!segLine) {
            console.warn('[probeH265] No segments found in manifest');
            return false;
        }

        const segUrl = segLine.startsWith('http') ? segLine.trim() : new URL(segLine.trim(), m3u8Url).href;
        console.log('[probeH265] Fetching segment (first 64KB):', segUrl);

        const segRes = await fetch(segUrl, {
            signal: AbortSignal.timeout(10000),
            headers: { Range: 'bytes=0-65535' },
        });

        const bytes = new Uint8Array(await segRes.arrayBuffer());
        console.log('[probeH265] Segment bytes received:', bytes.length);

        for (let i = 0; i < bytes.length - 5; i++) {
            if (bytes[i] === 0x00 && bytes[i + 1] === 0x00 &&
                bytes[i + 2] === 0x00 && bytes[i + 3] === 0x01) {
                const nalType = (bytes[i + 4] >> 1) & 0x3f;
                if (nalType >= 32 && nalType <= 40) {
                    console.log('[probeH265] HEVC NAL unit detected, type:', nalType, 'offset:', i);
                    return true;
                }
                i += 3;
            }
        }

        console.log('[probeH265] No HEVC NAL units found → non-H.265');
        return false;
    } catch (err) {
        console.error('[probeH265] Probe failed:', err.message);
        return false;
    }
}

/**
 * Parse M3U8 playlist → array of { url, duration }
 */
export function parseM3u8(text, baseUrl) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const segments = [];
    let duration = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            duration = parseFloat(lines[i].split(':')[1]);
            const url = lines[i + 1];
            if (url && !url.startsWith('#')) {
                segments.push({
                    url: url.startsWith('http') ? url : new URL(url, baseUrl).href,
                    duration,
                });
                i++;
            }
        }
    }
    return segments;
}