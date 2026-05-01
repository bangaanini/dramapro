root@srv1207789:~/dramapro# CONFIRM_RESTORE=YES npm run db:restore:local -- backups/supabase-prod_direct_url-full-2026-05-01T03-43-14-337Z.dump

> dramapro@0.1.0 db:restore:local
> node scripts/restore-postgres-db.mjs backups/supabase-prod_direct_url-full-2026-05-01T03-43-14-337Z.dump

Restore target env : LOCAL_DATABASE_URL
Dump file          : /root/dramapro/backups/supabase-prod_direct_url-full-2026-05-01T03-43-14-337Z.dump
Local pg_restore   : 16
Restore runner     : docker postgres:17
pg_restore: connecting to database for restore
pg_restore: while INITIALIZING:
pg_restore: error: could not execute query: ERROR:  unrecognized configuration parameter "transaction_timeout"
Command was: SET transaction_timeout = 0;
pg_restore: dropping EVENT TRIGGER pgrst_drop_watch
pg_restore: dropping EVENT TRIGGER pgrst_ddl_watch
pg_restore: dropping EVENT TRIGGER issue_pg_net_access
pg_restore: dropping EVENT TRIGGER issue_pg_graphql_access
pg_restore: dropping EVENT TRIGGER issue_pg_cron_access
pg_restore: dropping EVENT TRIGGER issue_graphql_placeholder
pg_restore: dropping PUBLICATION supabase_realtime
pg_restore: dropping FK CONSTRAINT vector_indexes vector_indexes_bucket_id_fkey
pg_restore: dropping FK CONSTRAINT s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey
pg_restore: dropping FK CONSTRAINT s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey
pg_restore: dropping FK CONSTRAINT s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey
pg_restore: dropping FK CONSTRAINT objects objects_bucketId_fkey
pg_restore: dropping FK CONSTRAINT WatchHistory WatchHistory_userId_fkey
pg_restore: dropping FK CONSTRAINT WatchHistory WatchHistory_seriesId_fkey
pg_restore: dropping FK CONSTRAINT WatchHistory WatchHistory_dramaId_fkey
pg_restore: dropping FK CONSTRAINT VipPayment VipPayment_vipPricePlanId_fkey
pg_restore: dropping FK CONSTRAINT VipPayment VipPayment_userId_fkey
pg_restore: dropping FK CONSTRAINT User User_referredByPartnerBotId_fkey
pg_restore: dropping FK CONSTRAINT User User_referredById_fkey
pg_restore: dropping FK CONSTRAINT UserSession UserSession_userId_fkey
pg_restore: dropping FK CONSTRAINT TelegramPartnerBot TelegramPartnerBot_ownerUserId_fkey
pg_restore: dropping FK CONSTRAINT SavedEpisode SavedEpisode_userId_fkey
pg_restore: dropping FK CONSTRAINT SavedEpisode SavedEpisode_seriesId_fkey
pg_restore: dropping FK CONSTRAINT SavedEpisode SavedEpisode_dramaId_fkey
pg_restore: dropping FK CONSTRAINT FavoriteDrama FavoriteDrama_userId_fkey
pg_restore: dropping FK CONSTRAINT FavoriteDrama FavoriteDrama_seriesId_fkey
pg_restore: dropping FK CONSTRAINT FavoriteDrama FavoriteDrama_dramaId_fkey
pg_restore: dropping FK CONSTRAINT DramaFeed DramaFeed_dramaId_fkey
pg_restore: dropping FK CONSTRAINT DramaChannelBroadcast DramaChannelBroadcast_seriesId_fkey
pg_restore: dropping FK CONSTRAINT DramaChannelBroadcast DramaChannelBroadcast_partnerBotId_fkey
pg_restore: dropping FK CONSTRAINT DramaChannelBroadcast DramaChannelBroadcast_ownerUserId_fkey
pg_restore: dropping FK CONSTRAINT DramaChannelBroadcast DramaChannelBroadcast_dramaId_fkey
pg_restore: dropping FK CONSTRAINT CatalogTab CatalogTab_platformId_fkey
pg_restore: dropping FK CONSTRAINT CatalogTab CatalogTab_languageId_fkey
pg_restore: dropping FK CONSTRAINT CatalogTabSeries CatalogTabSeries_tabId_fkey
pg_restore: dropping FK CONSTRAINT CatalogTabSeries CatalogTabSeries_seriesId_fkey
pg_restore: dropping FK CONSTRAINT CatalogSyncState CatalogSyncState_tabId_fkey
pg_restore: dropping FK CONSTRAINT CatalogSyncState CatalogSyncState_seriesId_fkey
pg_restore: dropping FK CONSTRAINT CatalogSeries CatalogSeries_platformId_fkey
pg_restore: dropping FK CONSTRAINT CatalogSeries CatalogSeries_languageId_fkey
pg_restore: dropping FK CONSTRAINT CatalogLanguage CatalogLanguage_platformId_fkey
pg_restore: dropping FK CONSTRAINT CatalogEpisode CatalogEpisode_seriesId_fkey
pg_restore: dropping FK CONSTRAINT AffiliateWithdrawal AffiliateWithdrawal_affiliateUserId_fkey
pg_restore: dropping FK CONSTRAINT AffiliatePayoutProfile AffiliatePayoutProfile_userId_fkey
pg_restore: dropping FK CONSTRAINT AffiliateCommission AffiliateCommission_vipPaymentId_fkey
pg_restore: dropping FK CONSTRAINT AffiliateCommission AffiliateCommission_referredUserId_fkey
pg_restore: dropping FK CONSTRAINT AffiliateCommission AffiliateCommission_partnerBotId_fkey
pg_restore: dropping FK CONSTRAINT AffiliateCommission AffiliateCommission_affiliateUserId_fkey
pg_restore: dropping FK CONSTRAINT AdminSession AdminSession_adminUserId_fkey
pg_restore: dropping FK CONSTRAINT webauthn_credentials webauthn_credentials_user_id_fkey
pg_restore: dropping FK CONSTRAINT webauthn_challenges webauthn_challenges_user_id_fkey
pg_restore: dropping FK CONSTRAINT sso_domains sso_domains_sso_provider_id_fkey
pg_restore: dropping FK CONSTRAINT sessions sessions_user_id_fkey
pg_restore: dropping FK CONSTRAINT sessions sessions_oauth_client_id_fkey
pg_restore: dropping FK CONSTRAINT saml_relay_states saml_relay_states_sso_provider_id_fkey
pg_restore: dropping FK CONSTRAINT saml_relay_states saml_relay_states_flow_state_id_fkey
pg_restore: dropping FK CONSTRAINT saml_providers saml_providers_sso_provider_id_fkey
pg_restore: dropping FK CONSTRAINT refresh_tokens refresh_tokens_session_id_fkey
pg_restore: dropping FK CONSTRAINT one_time_tokens one_time_tokens_user_id_fkey
pg_restore: dropping FK CONSTRAINT oauth_consents oauth_consents_user_id_fkey
pg_restore: dropping FK CONSTRAINT oauth_consents oauth_consents_client_id_fkey
pg_restore: dropping FK CONSTRAINT oauth_authorizations oauth_authorizations_user_id_fkey
pg_restore: dropping FK CONSTRAINT oauth_authorizations oauth_authorizations_client_id_fkey
pg_restore: dropping FK CONSTRAINT mfa_factors mfa_factors_user_id_fkey
pg_restore: dropping FK CONSTRAINT mfa_challenges mfa_challenges_auth_factor_id_fkey
pg_restore: dropping FK CONSTRAINT mfa_amr_claims mfa_amr_claims_session_id_fkey
pg_restore: dropping FK CONSTRAINT identities identities_user_id_fkey
pg_restore: dropping TRIGGER objects update_objects_updated_at
pg_restore: dropping TRIGGER objects protect_objects_delete
pg_restore: dropping TRIGGER buckets protect_buckets_delete
pg_restore: dropping TRIGGER buckets enforce_bucket_name_length_trigger
pg_restore: dropping TRIGGER subscription tr_check_filters
pg_restore: dropping INDEX vector_indexes_name_bucket_id_idx
pg_restore: dropping INDEX name_prefix_search
pg_restore: dropping INDEX idx_objects_bucket_id_name_lower
pg_restore: dropping INDEX idx_objects_bucket_id_name
pg_restore: dropping INDEX idx_multipart_uploads_list
pg_restore: dropping INDEX buckets_analytics_unique_name_idx
pg_restore: dropping INDEX bucketid_objname
pg_restore: dropping INDEX bname
pg_restore: dropping INDEX subscription_subscription_id_entity_filters_action_filter_key
pg_restore: dropping INDEX messages_inserted_at_topic_index
pg_restore: dropping INDEX ix_realtime_subscription_entity
pg_restore: dropping INDEX WatchHistory_userId_updatedAt_idx
pg_restore: dropping INDEX WatchHistory_userId_seriesId_key
pg_restore: dropping INDEX WatchHistory_userId_dramaId_key
pg_restore: dropping INDEX WatchHistory_seriesId_updatedAt_idx
pg_restore: dropping INDEX WatchHistory_dramaId_updatedAt_idx
pg_restore: dropping INDEX VipPricePlan_slug_key
pg_restore: dropping INDEX VipPricePlan_isActive_sortOrder_idx
pg_restore: dropping INDEX VipPayment_vipPricePlanId_createdAt_idx
pg_restore: dropping INDEX VipPayment_userId_status_createdAt_idx
pg_restore: dropping INDEX VipPayment_referenceId_key
pg_restore: dropping INDEX VipPayment_providerTransactionId_key
pg_restore: dropping INDEX User_telegramId_key
pg_restore: dropping INDEX User_referredByPartnerBotId_createdAt_idx
pg_restore: dropping INDEX User_referredById_createdAt_idx
pg_restore: dropping INDEX User_email_key
pg_restore: dropping INDEX User_affiliateCode_key
pg_restore: dropping INDEX UserSession_userId_expiresAt_idx
pg_restore: dropping INDEX UserSession_tokenHash_key
pg_restore: dropping INDEX TelegramPartnerBot_ownerUserId_isEnabled_idx
pg_restore: dropping INDEX TelegramPartnerBot_botUsername_key
pg_restore: dropping INDEX SavedEpisode_userId_updatedAt_idx
pg_restore: dropping INDEX SavedEpisode_userId_seriesId_episodeIndex_key
pg_restore: dropping INDEX SavedEpisode_userId_dramaId_episodeIndex_key
pg_restore: dropping INDEX SavedEpisode_seriesId_updatedAt_idx
pg_restore: dropping INDEX SavedEpisode_dramaId_updatedAt_idx
pg_restore: dropping INDEX ProviderWorkerLog_jobId_idx
pg_restore: dropping INDEX ProviderWorkerLog_createdAt_idx
pg_restore: dropping INDEX ProviderSyncJob_status_scheduledAt_priority_idx
pg_restore: dropping INDEX ProviderSyncJob_providerCode_status_createdAt_idx
pg_restore: dropping INDEX ProviderSyncJob_claim_queued_idx
pg_restore: dropping INDEX ProviderRuntimeControl_isHomepageVisible_providerName_idx
pg_restore: dropping INDEX PaymentGatewayConfig_provider_key
pg_restore: dropping INDEX FavoriteDrama_userId_seriesId_key
pg_restore: dropping INDEX FavoriteDrama_userId_dramaId_key
pg_restore: dropping INDEX FavoriteDrama_userId_createdAt_idx
pg_restore: dropping INDEX Drama_providerName_updatedAt_idx
pg_restore: dropping INDEX Drama_providerName_providerDramaId_key
pg_restore: dropping INDEX Drama_isStreamPlayable_updatedAt_idx
pg_restore: dropping INDEX DramaFeed_source_updatedAt_idx
pg_restore: dropping INDEX DramaFeed_dramaId_source_key
pg_restore: dropping INDEX DramaChannelBroadcast_seriesId_createdAt_idx
pg_restore: dropping INDEX DramaChannelBroadcast_partnerBotId_createdAt_idx
pg_restore: dropping INDEX DramaChannelBroadcast_ownerUserId_createdAt_idx
pg_restore: dropping INDEX DramaChannelBroadcast_dramaId_createdAt_idx
pg_restore: dropping INDEX DramaChannelBroadcast_botKind_createdAt_idx
pg_restore: dropping INDEX CatalogTab_type_sortOrder_idx
pg_restore: dropping INDEX CatalogTab_platformId_languageId_isActive_idx
pg_restore: dropping INDEX CatalogTabSeries_tabId_rank_idx
pg_restore: dropping INDEX CatalogTabSeries_seriesId_updatedAt_idx
pg_restore: dropping INDEX CatalogSyncState_scope_status_updatedAt_idx
pg_restore: dropping INDEX CatalogSyncJob_status_updatedAt_idx
pg_restore: dropping INDEX CatalogSyncJob_status_leaseExpiresAt_idx
pg_restore: dropping INDEX CatalogSyncJob_languageCode_createdAt_idx
pg_restore: dropping INDEX CatalogSeries_title_updatedAt_idx
pg_restore: dropping INDEX CatalogSeries_platformId_languageId_updatedAt_idx
pg_restore: dropping INDEX CatalogSeries_isHomepageVisible_updatedAt_idx
pg_restore: dropping INDEX CatalogSeries_catalogSource_isHomepageVisible_updatedAt_idx
pg_restore: dropping INDEX CatalogLanguage_platformId_isActive_idx
pg_restore: dropping INDEX CatalogEpisode_seriesId_upstreamEpisodeId_idx
pg_restore: dropping INDEX CatalogEpisode_seriesId_updatedAt_idx
pg_restore: dropping INDEX AffiliateWithdrawal_affiliateUserId_status_createdAt_idx
pg_restore: dropping INDEX AffiliatePayoutProfile_userId_key
pg_restore: dropping INDEX AffiliateCommission_vipPaymentId_key
pg_restore: dropping INDEX AffiliateCommission_referredUserId_createdAt_idx
pg_restore: dropping INDEX AffiliateCommission_partnerBotId_createdAt_idx
pg_restore: dropping INDEX AffiliateCommission_affiliateUserId_status_createdAt_idx
pg_restore: dropping INDEX AdminUser_email_key
pg_restore: dropping INDEX AdminSession_tokenHash_key
pg_restore: dropping INDEX AdminSession_adminUserId_expiresAt_idx
pg_restore: dropping INDEX webauthn_credentials_user_id_idx
pg_restore: dropping INDEX webauthn_credentials_credential_id_key
pg_restore: dropping INDEX webauthn_challenges_user_id_idx
pg_restore: dropping INDEX webauthn_challenges_expires_at_idx
pg_restore: dropping INDEX users_is_anonymous_idx
pg_restore: dropping INDEX users_instance_id_idx
pg_restore: dropping INDEX users_instance_id_email_idx
pg_restore: dropping INDEX users_email_partial_key
pg_restore: dropping INDEX user_id_created_at_idx
pg_restore: dropping INDEX unique_phone_factor_per_user
pg_restore: dropping INDEX sso_providers_resource_id_pattern_idx
pg_restore: dropping INDEX sso_providers_resource_id_idx
pg_restore: dropping INDEX sso_domains_sso_provider_id_idx
pg_restore: dropping INDEX sso_domains_domain_idx
pg_restore: dropping INDEX sessions_user_id_idx
pg_restore: dropping INDEX sessions_oauth_client_id_idx
pg_restore: dropping INDEX sessions_not_after_idx
pg_restore: dropping INDEX saml_relay_states_sso_provider_id_idx
pg_restore: dropping INDEX saml_relay_states_for_email_idx
pg_restore: dropping INDEX saml_relay_states_created_at_idx
pg_restore: dropping INDEX saml_providers_sso_provider_id_idx
pg_restore: dropping INDEX refresh_tokens_updated_at_idx
pg_restore: dropping INDEX refresh_tokens_session_id_revoked_idx
pg_restore: dropping INDEX refresh_tokens_parent_idx
pg_restore: dropping INDEX refresh_tokens_instance_id_user_id_idx
pg_restore: dropping INDEX refresh_tokens_instance_id_idx
pg_restore: dropping INDEX recovery_token_idx
pg_restore: dropping INDEX reauthentication_token_idx
pg_restore: dropping INDEX one_time_tokens_user_id_token_type_key
pg_restore: dropping INDEX one_time_tokens_token_hash_hash_idx
pg_restore: dropping INDEX one_time_tokens_relates_to_hash_idx
pg_restore: dropping INDEX oauth_consents_user_order_idx
pg_restore: dropping INDEX oauth_consents_active_user_client_idx
pg_restore: dropping INDEX oauth_consents_active_client_idx
pg_restore: dropping INDEX oauth_clients_deleted_at_idx
pg_restore: dropping INDEX oauth_auth_pending_exp_idx
pg_restore: dropping INDEX mfa_factors_user_id_idx
pg_restore: dropping INDEX mfa_factors_user_friendly_name_unique
pg_restore: dropping INDEX mfa_challenge_created_at_idx
pg_restore: dropping INDEX idx_users_name
pg_restore: dropping INDEX idx_users_last_sign_in_at_desc
pg_restore: dropping INDEX idx_users_email
pg_restore: dropping INDEX idx_users_created_at_desc
pg_restore: dropping INDEX idx_user_id_auth_method
pg_restore: dropping INDEX idx_oauth_client_states_created_at
pg_restore: dropping INDEX idx_auth_code
pg_restore: dropping INDEX identities_user_id_idx
pg_restore: dropping INDEX identities_email_idx
pg_restore: dropping INDEX flow_state_created_at_idx
pg_restore: dropping INDEX factor_id_created_at_idx
pg_restore: dropping INDEX email_change_token_new_idx
pg_restore: dropping INDEX email_change_token_current_idx
pg_restore: dropping INDEX custom_oauth_providers_provider_type_idx
pg_restore: dropping INDEX custom_oauth_providers_identifier_idx
pg_restore: dropping INDEX custom_oauth_providers_enabled_idx
pg_restore: dropping INDEX custom_oauth_providers_created_at_idx
pg_restore: dropping INDEX confirmation_token_idx
pg_restore: dropping INDEX audit_logs_instance_id_idx
pg_restore: dropping CONSTRAINT vector_indexes vector_indexes_pkey
pg_restore: dropping CONSTRAINT s3_multipart_uploads s3_multipart_uploads_pkey
pg_restore: dropping CONSTRAINT s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey
pg_restore: dropping CONSTRAINT objects objects_pkey
pg_restore: dropping CONSTRAINT migrations migrations_pkey
pg_restore: dropping CONSTRAINT migrations migrations_name_key
pg_restore: dropping CONSTRAINT buckets_vectors buckets_vectors_pkey
pg_restore: dropping CONSTRAINT buckets buckets_pkey
pg_restore: dropping CONSTRAINT buckets_analytics buckets_analytics_pkey
pg_restore: dropping CONSTRAINT schema_migrations schema_migrations_pkey
pg_restore: dropping CONSTRAINT subscription pk_subscription
pg_restore: dropping CONSTRAINT messages messages_pkey
pg_restore: dropping CONSTRAINT _prisma_migrations _prisma_migrations_pkey
pg_restore: dropping CONSTRAINT WatchHistory WatchHistory_pkey
pg_restore: dropping CONSTRAINT VipSettings VipSettings_pkey
pg_restore: dropping CONSTRAINT VipPricePlan VipPricePlan_pkey
pg_restore: dropping CONSTRAINT VipPayment VipPayment_pkey
pg_restore: dropping CONSTRAINT User User_pkey
pg_restore: dropping CONSTRAINT UserSession UserSession_pkey
pg_restore: dropping CONSTRAINT TelegramPartnerBot TelegramPartnerBot_pkey
pg_restore: dropping CONSTRAINT SavedEpisode SavedEpisode_pkey
pg_restore: dropping CONSTRAINT ProviderWorkerLog ProviderWorkerLog_pkey
pg_restore: dropping CONSTRAINT ProviderSyncJob ProviderSyncJob_pkey
pg_restore: dropping CONSTRAINT ProviderRuntimeControl ProviderRuntimeControl_pkey
pg_restore: dropping CONSTRAINT PaymentGatewaySettings PaymentGatewaySettings_pkey
pg_restore: dropping CONSTRAINT PaymentGatewayConfig PaymentGatewayConfig_pkey
pg_restore: dropping CONSTRAINT FavoriteDrama FavoriteDrama_pkey
pg_restore: dropping CONSTRAINT Drama Drama_pkey
pg_restore: dropping CONSTRAINT DramaFeed DramaFeed_pkey
pg_restore: dropping CONSTRAINT DramaChannelBroadcast DramaChannelBroadcast_pkey
pg_restore: dropping CONSTRAINT CatalogTab CatalogTab_pkey
pg_restore: dropping CONSTRAINT CatalogTab CatalogTab_languageId_type_positionIndex_sortOrder_key
pg_restore: dropping CONSTRAINT CatalogTabSeries CatalogTabSeries_tabId_seriesId_key
pg_restore: dropping CONSTRAINT CatalogTabSeries CatalogTabSeries_pkey
pg_restore: dropping CONSTRAINT CatalogSyncState CatalogSyncState_tabId_key
pg_restore: dropping CONSTRAINT CatalogSyncState CatalogSyncState_seriesId_key
pg_restore: dropping CONSTRAINT CatalogSyncState CatalogSyncState_pkey
pg_restore: dropping CONSTRAINT CatalogSyncJob CatalogSyncJob_pkey
pg_restore: dropping CONSTRAINT CatalogSeries CatalogSeries_platformId_languageId_upstreamSeriesId_key
pg_restore: dropping CONSTRAINT CatalogSeries CatalogSeries_pkey
pg_restore: dropping CONSTRAINT CatalogPlatform CatalogPlatform_pkey
pg_restore: dropping CONSTRAINT CatalogLanguage CatalogLanguage_platformId_code_key
pg_restore: dropping CONSTRAINT CatalogLanguage CatalogLanguage_pkey
pg_restore: dropping CONSTRAINT CatalogEpisode CatalogEpisode_seriesId_episodeIndex_key
pg_restore: dropping CONSTRAINT CatalogEpisode CatalogEpisode_pkey
pg_restore: dropping CONSTRAINT AppSettings AppSettings_pkey
pg_restore: dropping CONSTRAINT AffiliateWithdrawal AffiliateWithdrawal_pkey
pg_restore: dropping CONSTRAINT AffiliateSettings AffiliateSettings_pkey
pg_restore: dropping CONSTRAINT AffiliatePayoutProfile AffiliatePayoutProfile_pkey
pg_restore: dropping CONSTRAINT AffiliateCommission AffiliateCommission_pkey
pg_restore: dropping CONSTRAINT AdminUser AdminUser_pkey
pg_restore: dropping CONSTRAINT AdminSession AdminSession_pkey
pg_restore: dropping CONSTRAINT webauthn_credentials webauthn_credentials_pkey
pg_restore: dropping CONSTRAINT webauthn_challenges webauthn_challenges_pkey
pg_restore: dropping CONSTRAINT users users_pkey
pg_restore: dropping CONSTRAINT users users_phone_key
pg_restore: dropping CONSTRAINT sso_providers sso_providers_pkey
pg_restore: dropping CONSTRAINT sso_domains sso_domains_pkey
pg_restore: dropping CONSTRAINT sessions sessions_pkey
pg_restore: dropping CONSTRAINT schema_migrations schema_migrations_pkey
pg_restore: dropping CONSTRAINT saml_relay_states saml_relay_states_pkey
pg_restore: dropping CONSTRAINT saml_providers saml_providers_pkey
pg_restore: dropping CONSTRAINT saml_providers saml_providers_entity_id_key
pg_restore: dropping CONSTRAINT refresh_tokens refresh_tokens_token_unique
pg_restore: dropping CONSTRAINT refresh_tokens refresh_tokens_pkey
pg_restore: dropping CONSTRAINT one_time_tokens one_time_tokens_pkey
pg_restore: dropping CONSTRAINT oauth_consents oauth_consents_user_client_unique
pg_restore: dropping CONSTRAINT oauth_consents oauth_consents_pkey
pg_restore: dropping CONSTRAINT oauth_clients oauth_clients_pkey
pg_restore: dropping CONSTRAINT oauth_client_states oauth_client_states_pkey
pg_restore: dropping CONSTRAINT oauth_authorizations oauth_authorizations_pkey
pg_restore: dropping CONSTRAINT oauth_authorizations oauth_authorizations_authorization_id_key
pg_restore: dropping CONSTRAINT oauth_authorizations oauth_authorizations_authorization_code_key
pg_restore: dropping CONSTRAINT mfa_factors mfa_factors_pkey
pg_restore: dropping CONSTRAINT mfa_factors mfa_factors_last_challenged_at_key
pg_restore: dropping CONSTRAINT mfa_challenges mfa_challenges_pkey
pg_restore: dropping CONSTRAINT mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey
pg_restore: dropping CONSTRAINT instances instances_pkey
pg_restore: dropping CONSTRAINT identities identities_provider_id_provider_unique
pg_restore: dropping CONSTRAINT identities identities_pkey
pg_restore: dropping CONSTRAINT flow_state flow_state_pkey
pg_restore: dropping CONSTRAINT custom_oauth_providers custom_oauth_providers_pkey
pg_restore: dropping CONSTRAINT custom_oauth_providers custom_oauth_providers_identifier_key
pg_restore: dropping CONSTRAINT audit_log_entries audit_log_entries_pkey
pg_restore: dropping CONSTRAINT mfa_amr_claims amr_id_pk
pg_restore: dropping DEFAULT refresh_tokens id
pg_restore: dropping TABLE vector_indexes
pg_restore: dropping TABLE s3_multipart_uploads_parts
pg_restore: dropping TABLE s3_multipart_uploads
pg_restore: dropping TABLE objects
pg_restore: dropping TABLE migrations
pg_restore: dropping TABLE buckets_vectors
pg_restore: dropping TABLE buckets_analytics
pg_restore: dropping TABLE buckets
pg_restore: dropping SEQUENCE subscription_id_seq
pg_restore: dropping TABLE subscription
pg_restore: dropping TABLE schema_migrations
pg_restore: dropping TABLE messages
pg_restore: dropping TABLE _prisma_migrations
pg_restore: dropping TABLE WatchHistory
pg_restore: dropping TABLE VipSettings
pg_restore: dropping TABLE VipPricePlan
pg_restore: dropping TABLE VipPayment
pg_restore: dropping TABLE UserSession
pg_restore: dropping TABLE User
pg_restore: dropping TABLE TelegramPartnerBot
pg_restore: dropping TABLE SavedEpisode
pg_restore: dropping TABLE ProviderWorkerLog
pg_restore: dropping TABLE ProviderSyncJob
pg_restore: dropping TABLE ProviderRuntimeControl
pg_restore: dropping TABLE PaymentGatewaySettings
pg_restore: dropping TABLE PaymentGatewayConfig
pg_restore: dropping TABLE FavoriteDrama
pg_restore: dropping TABLE DramaFeed
pg_restore: dropping TABLE DramaChannelBroadcast
pg_restore: dropping TABLE Drama
pg_restore: dropping TABLE CatalogTabSeries
pg_restore: dropping TABLE CatalogTab
pg_restore: dropping TABLE CatalogSyncState
pg_restore: dropping TABLE CatalogSyncJob
pg_restore: dropping TABLE CatalogSeries
pg_restore: dropping TABLE CatalogPlatform
pg_restore: dropping TABLE CatalogLanguage
pg_restore: dropping TABLE CatalogEpisode
pg_restore: dropping TABLE AppSettings
pg_restore: dropping TABLE AffiliateWithdrawal
pg_restore: dropping TABLE AffiliateSettings
pg_restore: dropping TABLE AffiliatePayoutProfile
pg_restore: dropping TABLE AffiliateCommission
pg_restore: dropping TABLE AdminUser
pg_restore: dropping TABLE AdminSession
pg_restore: dropping TABLE webauthn_credentials
pg_restore: dropping TABLE webauthn_challenges
pg_restore: dropping TABLE users
pg_restore: dropping TABLE sso_providers
pg_restore: dropping TABLE sso_domains
pg_restore: dropping TABLE sessions
pg_restore: dropping TABLE schema_migrations
pg_restore: dropping TABLE saml_relay_states
pg_restore: dropping TABLE saml_providers
pg_restore: dropping SEQUENCE refresh_tokens_id_seq
pg_restore: dropping TABLE refresh_tokens
pg_restore: dropping TABLE one_time_tokens
pg_restore: dropping TABLE oauth_consents
pg_restore: dropping TABLE oauth_clients
pg_restore: dropping TABLE oauth_client_states
pg_restore: dropping TABLE oauth_authorizations
pg_restore: dropping TABLE mfa_factors
pg_restore: dropping TABLE mfa_challenges
pg_restore: dropping TABLE mfa_amr_claims
pg_restore: dropping TABLE instances
pg_restore: dropping TABLE identities
pg_restore: dropping TABLE flow_state
pg_restore: dropping TABLE custom_oauth_providers
pg_restore: dropping TABLE audit_log_entries
pg_restore: dropping FUNCTION update_updated_at_column()
pg_restore: dropping FUNCTION search_v2(text, text, integer, integer, text, text, text, text)
pg_restore: dropping FUNCTION search_by_timestamp(text, text, integer, integer, text, text, text, text)
pg_restore: dropping FUNCTION search(text, text, integer, integer, integer, text, text, text)
pg_restore: dropping FUNCTION protect_delete()
pg_restore: dropping FUNCTION operation()
pg_restore: dropping FUNCTION list_objects_with_delimiter(text, text, text, integer, text, text, text)
pg_restore: dropping FUNCTION list_multipart_uploads_with_delimiter(text, text, text, integer, text, text)
pg_restore: dropping FUNCTION get_size_by_bucket()
pg_restore: dropping FUNCTION get_common_prefix(text, text, text)
pg_restore: dropping FUNCTION foldername(text)
pg_restore: dropping FUNCTION filename(text)
pg_restore: dropping FUNCTION extension(text)
pg_restore: dropping FUNCTION enforce_bucket_name_length()
pg_restore: dropping FUNCTION can_insert_object(text, text, uuid, jsonb)
pg_restore: dropping FUNCTION allow_only_operation(text)
pg_restore: dropping FUNCTION allow_any_operation(text[])
pg_restore: dropping FUNCTION topic()
pg_restore: dropping FUNCTION to_regrole(text)
pg_restore: dropping FUNCTION subscription_check_filters()
pg_restore: dropping FUNCTION send(jsonb, text, text, boolean)
pg_restore: dropping FUNCTION quote_wal2json(regclass)
pg_restore: dropping FUNCTION list_changes(name, name, integer, integer)
pg_restore: dropping FUNCTION is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[])
pg_restore: dropping FUNCTION check_equality_op(realtime.equality_op, regtype, text, text)
pg_restore: dropping FUNCTION cast(text, regtype)
pg_restore: dropping FUNCTION build_prepared_statement_sql(text, regclass, realtime.wal_column[])
pg_restore: dropping FUNCTION broadcast_changes(text, text, text, text, text, record, record, text)
pg_restore: dropping FUNCTION apply_rls(jsonb, integer)
pg_restore: dropping FUNCTION get_auth(text)
pg_restore: dropping FUNCTION graphql(text, text, jsonb, jsonb)
pg_restore: dropping FUNCTION set_graphql_placeholder()
pg_restore: dropping FUNCTION pgrst_drop_watch()
pg_restore: dropping FUNCTION pgrst_ddl_watch()
pg_restore: dropping FUNCTION grant_pg_net_access()
pg_restore: dropping FUNCTION grant_pg_graphql_access()
pg_restore: dropping FUNCTION grant_pg_cron_access()
pg_restore: dropping FUNCTION uid()
pg_restore: dropping FUNCTION role()
pg_restore: dropping FUNCTION jwt()
pg_restore: dropping FUNCTION email()
pg_restore: dropping TYPE buckettype
pg_restore: dropping TYPE wal_rls
pg_restore: dropping TYPE wal_column
pg_restore: dropping TYPE user_defined_filter
pg_restore: dropping TYPE equality_op
pg_restore: dropping TYPE action
pg_restore: dropping TYPE VipPaymentStatus
pg_restore: dropping TYPE UserAuthProvider
pg_restore: dropping TYPE ProviderName
pg_restore: dropping TYPE ProviderHealthStatus
pg_restore: dropping TYPE PaymentGatewayProvider
pg_restore: dropping TYPE FeedSource
pg_restore: dropping TYPE CatalogSyncStatus
pg_restore: dropping TYPE CatalogSyncScope
pg_restore: dropping TYPE AffiliateWithdrawalStatus
pg_restore: dropping TYPE AffiliateCommissionStatus
pg_restore: dropping TYPE one_time_token_type
pg_restore: dropping TYPE oauth_response_type
pg_restore: dropping TYPE oauth_registration_type
pg_restore: dropping TYPE oauth_client_type
pg_restore: dropping TYPE oauth_authorization_status
pg_restore: dropping TYPE factor_type
pg_restore: dropping TYPE factor_status
pg_restore: dropping TYPE code_challenge_method
pg_restore: dropping TYPE aal_level
pg_restore: dropping EXTENSION uuid-ossp
pg_restore: dropping EXTENSION supabase_vault
pg_restore: dropping EXTENSION pgcrypto
pg_restore: dropping EXTENSION pg_stat_statements
pg_restore: dropping SCHEMA vault
pg_restore: dropping SCHEMA storage
pg_restore: dropping SCHEMA realtime
pg_restore: dropping SCHEMA pgbouncer
pg_restore: dropping SCHEMA graphql_public
pg_restore: dropping SCHEMA graphql
pg_restore: dropping SCHEMA extensions
pg_restore: dropping SCHEMA auth
pg_restore: creating SCHEMA "auth"
pg_restore: creating SCHEMA "extensions"
pg_restore: creating SCHEMA "graphql"
pg_restore: creating SCHEMA "graphql_public"
pg_restore: creating SCHEMA "pgbouncer"
pg_restore: creating SCHEMA "realtime"
pg_restore: creating SCHEMA "storage"
pg_restore: creating SCHEMA "vault"
pg_restore: creating EXTENSION "pg_stat_statements"
pg_restore: while PROCESSING TOC:
pg_restore: from TOC entry 2; 3079 16393 EXTENSION pg_stat_statements (no owner)
pg_restore: error: could not execute query: ERROR:  permission denied to create extension "pg_stat_statements"
HINT:  Must be superuser to create this extension.
Command was: CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


pg_restore: creating COMMENT "EXTENSION pg_stat_statements"
pg_restore: from TOC entry 4814; 0 0 COMMENT EXTENSION pg_stat_statements
pg_restore: error: could not execute query: ERROR:  extension "pg_stat_statements" does not exist
Command was: COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


pg_restore: creating EXTENSION "pgcrypto"
pg_restore: creating COMMENT "EXTENSION pgcrypto"
pg_restore: creating EXTENSION "supabase_vault"
pg_restore: from TOC entry 5; 3079 16608 EXTENSION supabase_vault (no owner)
pg_restore: error: could not execute query: ERROR:  extension "supabase_vault" is not available
DETAIL:  Could not open extension control file "/usr/share/postgresql/16/extension/supabase_vault.control": No such file or directory.
HINT:  The extension must first be installed on the system where PostgreSQL is running.
Command was: CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


pg_restore: creating COMMENT "EXTENSION supabase_vault"
pg_restore: from TOC entry 4816; 0 0 COMMENT EXTENSION supabase_vault
pg_restore: error: could not execute query: ERROR:  extension "supabase_vault" does not exist
Command was: COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


pg_restore: creating EXTENSION "uuid-ossp"
pg_restore: creating COMMENT "EXTENSION "uuid-ossp""
pg_restore: creating TYPE "auth.aal_level"
pg_restore: creating TYPE "auth.code_challenge_method"
pg_restore: creating TYPE "auth.factor_status"
pg_restore: creating TYPE "auth.factor_type"
pg_restore: creating TYPE "auth.oauth_authorization_status"
pg_restore: creating TYPE "auth.oauth_client_type"
pg_restore: creating TYPE "auth.oauth_registration_type"
pg_restore: creating TYPE "auth.oauth_response_type"
pg_restore: creating TYPE "auth.one_time_token_type"
pg_restore: creating TYPE "public.AffiliateCommissionStatus"
pg_restore: creating TYPE "public.AffiliateWithdrawalStatus"
pg_restore: creating TYPE "public.CatalogSyncScope"
pg_restore: creating TYPE "public.CatalogSyncStatus"
pg_restore: creating TYPE "public.FeedSource"
pg_restore: creating TYPE "public.PaymentGatewayProvider"
pg_restore: creating TYPE "public.ProviderHealthStatus"
pg_restore: creating TYPE "public.ProviderName"
pg_restore: creating TYPE "public.UserAuthProvider"
pg_restore: creating TYPE "public.VipPaymentStatus"
pg_restore: creating TYPE "realtime.action"
pg_restore: creating TYPE "realtime.equality_op"
pg_restore: creating TYPE "realtime.user_defined_filter"
pg_restore: creating TYPE "realtime.wal_column"
pg_restore: creating TYPE "realtime.wal_rls"
pg_restore: creating TYPE "storage.buckettype"
pg_restore: creating FUNCTION "auth.email()"
pg_restore: creating COMMENT "auth.FUNCTION email()"
pg_restore: creating FUNCTION "auth.jwt()"
pg_restore: creating FUNCTION "auth.role()"
pg_restore: creating COMMENT "auth.FUNCTION role()"
pg_restore: creating FUNCTION "auth.uid()"
pg_restore: creating COMMENT "auth.FUNCTION uid()"
pg_restore: creating FUNCTION "extensions.grant_pg_cron_access()"
pg_restore: creating COMMENT "extensions.FUNCTION grant_pg_cron_access()"
pg_restore: creating FUNCTION "extensions.grant_pg_graphql_access()"
pg_restore: creating COMMENT "extensions.FUNCTION grant_pg_graphql_access()"
pg_restore: creating FUNCTION "extensions.grant_pg_net_access()"
pg_restore: creating COMMENT "extensions.FUNCTION grant_pg_net_access()"
pg_restore: creating FUNCTION "extensions.pgrst_ddl_watch()"
pg_restore: creating FUNCTION "extensions.pgrst_drop_watch()"
pg_restore: creating FUNCTION "extensions.set_graphql_placeholder()"
pg_restore: creating COMMENT "extensions.FUNCTION set_graphql_placeholder()"
pg_restore: creating FUNCTION "graphql_public.graphql(text, text, jsonb, jsonb)"
pg_restore: creating FUNCTION "pgbouncer.get_auth(text)"
pg_restore: creating FUNCTION "realtime.apply_rls(jsonb, integer)"
pg_restore: creating FUNCTION "realtime.broadcast_changes(text, text, text, text, text, record, record, text)"
pg_restore: creating FUNCTION "realtime.build_prepared_statement_sql(text, regclass, realtime.wal_column[])"
pg_restore: creating FUNCTION "realtime.cast(text, regtype)"
pg_restore: creating FUNCTION "realtime.check_equality_op(realtime.equality_op, regtype, text, text)"
pg_restore: creating FUNCTION "realtime.is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[])"
pg_restore: creating FUNCTION "realtime.list_changes(name, name, integer, integer)"
pg_restore: from TOC entry 441; 1255 17858 FUNCTION list_changes(name, name, integer, integer) supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to set parameter "log_min_messages"
Command was: CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


pg_restore: creating FUNCTION "realtime.quote_wal2json(regclass)"
pg_restore: creating FUNCTION "realtime.send(jsonb, text, text, boolean)"
pg_restore: creating FUNCTION "realtime.subscription_check_filters()"
pg_restore: creating FUNCTION "realtime.to_regrole(text)"
pg_restore: creating FUNCTION "realtime.topic()"
pg_restore: creating FUNCTION "storage.allow_any_operation(text[])"
pg_restore: creating FUNCTION "storage.allow_only_operation(text)"
pg_restore: creating FUNCTION "storage.can_insert_object(text, text, uuid, jsonb)"
pg_restore: creating FUNCTION "storage.enforce_bucket_name_length()"
pg_restore: creating FUNCTION "storage.extension(text)"
pg_restore: creating FUNCTION "storage.filename(text)"
pg_restore: creating FUNCTION "storage.foldername(text)"
pg_restore: creating FUNCTION "storage.get_common_prefix(text, text, text)"
pg_restore: creating FUNCTION "storage.get_size_by_bucket()"
pg_restore: creating FUNCTION "storage.list_multipart_uploads_with_delimiter(text, text, text, integer, text, text)"
pg_restore: creating FUNCTION "storage.list_objects_with_delimiter(text, text, text, integer, text, text, text)"
pg_restore: creating FUNCTION "storage.operation()"
pg_restore: creating FUNCTION "storage.protect_delete()"
pg_restore: creating FUNCTION "storage.search(text, text, integer, integer, integer, text, text, text)"
pg_restore: creating FUNCTION "storage.search_by_timestamp(text, text, integer, integer, text, text, text, text)"
pg_restore: creating FUNCTION "storage.search_v2(text, text, integer, integer, text, text, text, text)"
pg_restore: creating FUNCTION "storage.update_updated_at_column()"
pg_restore: creating TABLE "auth.audit_log_entries"
pg_restore: creating COMMENT "auth.TABLE audit_log_entries"
pg_restore: creating TABLE "auth.custom_oauth_providers"
pg_restore: creating TABLE "auth.flow_state"
pg_restore: creating COMMENT "auth.TABLE flow_state"
pg_restore: creating TABLE "auth.identities"
pg_restore: creating COMMENT "auth.TABLE identities"
pg_restore: creating COMMENT "auth.COLUMN identities.email"
pg_restore: creating TABLE "auth.instances"
pg_restore: creating COMMENT "auth.TABLE instances"
pg_restore: creating TABLE "auth.mfa_amr_claims"
pg_restore: creating COMMENT "auth.TABLE mfa_amr_claims"
pg_restore: creating TABLE "auth.mfa_challenges"
pg_restore: creating COMMENT "auth.TABLE mfa_challenges"
pg_restore: creating TABLE "auth.mfa_factors"
pg_restore: creating COMMENT "auth.TABLE mfa_factors"
pg_restore: creating COMMENT "auth.COLUMN mfa_factors.last_webauthn_challenge_data"
pg_restore: creating TABLE "auth.oauth_authorizations"
pg_restore: creating TABLE "auth.oauth_client_states"
pg_restore: creating COMMENT "auth.TABLE oauth_client_states"
pg_restore: creating TABLE "auth.oauth_clients"
pg_restore: creating TABLE "auth.oauth_consents"
pg_restore: creating TABLE "auth.one_time_tokens"
pg_restore: creating TABLE "auth.refresh_tokens"
pg_restore: creating COMMENT "auth.TABLE refresh_tokens"
pg_restore: creating SEQUENCE "auth.refresh_tokens_id_seq"
pg_restore: creating SEQUENCE OWNED BY "auth.refresh_tokens_id_seq"
pg_restore: creating TABLE "auth.saml_providers"
pg_restore: creating COMMENT "auth.TABLE saml_providers"
pg_restore: creating TABLE "auth.saml_relay_states"
pg_restore: creating COMMENT "auth.TABLE saml_relay_states"
pg_restore: creating TABLE "auth.schema_migrations"
pg_restore: creating COMMENT "auth.TABLE schema_migrations"
pg_restore: creating TABLE "auth.sessions"
pg_restore: creating COMMENT "auth.TABLE sessions"
pg_restore: creating COMMENT "auth.COLUMN sessions.not_after"
pg_restore: creating COMMENT "auth.COLUMN sessions.refresh_token_hmac_key"
pg_restore: creating COMMENT "auth.COLUMN sessions.refresh_token_counter"
pg_restore: creating TABLE "auth.sso_domains"
pg_restore: creating COMMENT "auth.TABLE sso_domains"
pg_restore: creating TABLE "auth.sso_providers"
pg_restore: creating COMMENT "auth.TABLE sso_providers"
pg_restore: creating COMMENT "auth.COLUMN sso_providers.resource_id"
pg_restore: creating TABLE "auth.users"
pg_restore: creating COMMENT "auth.TABLE users"
pg_restore: creating COMMENT "auth.COLUMN users.is_sso_user"
pg_restore: creating TABLE "auth.webauthn_challenges"
pg_restore: creating TABLE "auth.webauthn_credentials"
pg_restore: creating TABLE "public.AdminSession"
pg_restore: creating TABLE "public.AdminUser"
pg_restore: creating TABLE "public.AffiliateCommission"
pg_restore: creating TABLE "public.AffiliatePayoutProfile"
pg_restore: creating TABLE "public.AffiliateSettings"
pg_restore: creating TABLE "public.AffiliateWithdrawal"
pg_restore: creating TABLE "public.AppSettings"
pg_restore: creating TABLE "public.CatalogEpisode"
pg_restore: creating TABLE "public.CatalogLanguage"
pg_restore: creating TABLE "public.CatalogPlatform"
pg_restore: creating TABLE "public.CatalogSeries"
pg_restore: creating TABLE "public.CatalogSyncJob"
pg_restore: creating TABLE "public.CatalogSyncState"
pg_restore: creating TABLE "public.CatalogTab"
pg_restore: creating TABLE "public.CatalogTabSeries"
pg_restore: creating TABLE "public.Drama"
pg_restore: creating TABLE "public.DramaChannelBroadcast"
pg_restore: creating TABLE "public.DramaFeed"
pg_restore: creating TABLE "public.FavoriteDrama"
pg_restore: creating TABLE "public.PaymentGatewayConfig"
pg_restore: creating TABLE "public.PaymentGatewaySettings"
pg_restore: creating TABLE "public.ProviderRuntimeControl"
pg_restore: creating TABLE "public.ProviderSyncJob"
pg_restore: creating TABLE "public.ProviderWorkerLog"
pg_restore: creating TABLE "public.SavedEpisode"
pg_restore: creating TABLE "public.TelegramPartnerBot"
pg_restore: creating TABLE "public.User"
pg_restore: creating TABLE "public.UserSession"
pg_restore: creating TABLE "public.VipPayment"
pg_restore: creating TABLE "public.VipPricePlan"
pg_restore: creating TABLE "public.VipSettings"
pg_restore: creating TABLE "public.WatchHistory"
pg_restore: creating TABLE "public._prisma_migrations"
pg_restore: creating TABLE "realtime.messages"
pg_restore: creating TABLE "realtime.schema_migrations"
pg_restore: creating TABLE "realtime.subscription"
pg_restore: creating SEQUENCE "realtime.subscription_id_seq"
pg_restore: creating TABLE "storage.buckets"
pg_restore: creating COMMENT "storage.COLUMN buckets.owner"
pg_restore: creating TABLE "storage.buckets_analytics"
pg_restore: creating TABLE "storage.buckets_vectors"
pg_restore: creating TABLE "storage.migrations"
pg_restore: creating TABLE "storage.objects"
pg_restore: creating COMMENT "storage.COLUMN objects.owner"
pg_restore: creating TABLE "storage.s3_multipart_uploads"
pg_restore: creating TABLE "storage.s3_multipart_uploads_parts"
pg_restore: creating TABLE "storage.vector_indexes"
pg_restore: creating DEFAULT "auth.refresh_tokens id"
pg_restore: processing data for table "auth.audit_log_entries"
pg_restore: processing data for table "auth.custom_oauth_providers"
pg_restore: processing data for table "auth.flow_state"
pg_restore: processing data for table "auth.identities"
pg_restore: processing data for table "auth.instances"
pg_restore: processing data for table "auth.mfa_amr_claims"
pg_restore: processing data for table "auth.mfa_challenges"
pg_restore: processing data for table "auth.mfa_factors"
pg_restore: processing data for table "auth.oauth_authorizations"
pg_restore: processing data for table "auth.oauth_client_states"
pg_restore: processing data for table "auth.oauth_clients"
pg_restore: processing data for table "auth.oauth_consents"
pg_restore: processing data for table "auth.one_time_tokens"
pg_restore: processing data for table "auth.refresh_tokens"
pg_restore: processing data for table "auth.saml_providers"
pg_restore: processing data for table "auth.saml_relay_states"
pg_restore: processing data for table "auth.schema_migrations"
pg_restore: processing data for table "auth.sessions"
pg_restore: processing data for table "auth.sso_domains"
pg_restore: processing data for table "auth.sso_providers"
pg_restore: processing data for table "auth.users"
pg_restore: processing data for table "auth.webauthn_challenges"
pg_restore: processing data for table "auth.webauthn_credentials"
pg_restore: processing data for table "public.AdminSession"
pg_restore: processing data for table "public.AdminUser"
pg_restore: processing data for table "public.AffiliateCommission"
pg_restore: processing data for table "public.AffiliatePayoutProfile"
pg_restore: processing data for table "public.AffiliateSettings"
pg_restore: processing data for table "public.AffiliateWithdrawal"
pg_restore: processing data for table "public.AppSettings"
pg_restore: processing data for table "public.CatalogEpisode"
pg_restore: processing data for table "public.CatalogLanguage"
pg_restore: processing data for table "public.CatalogPlatform"
pg_restore: processing data for table "public.CatalogSeries"
pg_restore: processing data for table "public.CatalogSyncJob"
pg_restore: processing data for table "public.CatalogSyncState"
pg_restore: processing data for table "public.CatalogTab"
pg_restore: processing data for table "public.CatalogTabSeries"
pg_restore: processing data for table "public.Drama"
pg_restore: processing data for table "public.DramaChannelBroadcast"
pg_restore: processing data for table "public.DramaFeed"
pg_restore: processing data for table "public.FavoriteDrama"
pg_restore: processing data for table "public.PaymentGatewayConfig"
pg_restore: processing data for table "public.PaymentGatewaySettings"
pg_restore: processing data for table "public.ProviderRuntimeControl"
pg_restore: processing data for table "public.ProviderSyncJob"
pg_restore: processing data for table "public.ProviderWorkerLog"
pg_restore: processing data for table "public.SavedEpisode"
pg_restore: processing data for table "public.TelegramPartnerBot"
pg_restore: processing data for table "public.User"
pg_restore: processing data for table "public.UserSession"
pg_restore: processing data for table "public.VipPayment"
pg_restore: processing data for table "public.VipPricePlan"
pg_restore: processing data for table "public.VipSettings"
pg_restore: processing data for table "public.WatchHistory"
pg_restore: processing data for table "public._prisma_migrations"
pg_restore: processing data for table "realtime.schema_migrations"
pg_restore: processing data for table "realtime.subscription"
pg_restore: processing data for table "storage.buckets"
pg_restore: processing data for table "storage.buckets_analytics"
pg_restore: processing data for table "storage.buckets_vectors"
pg_restore: processing data for table "storage.migrations"
pg_restore: processing data for table "storage.objects"
pg_restore: processing data for table "storage.s3_multipart_uploads"
pg_restore: processing data for table "storage.s3_multipart_uploads_parts"
pg_restore: processing data for table "storage.vector_indexes"
pg_restore: processing data for table "vault.secrets"
pg_restore: from TOC entry 3863; 0 16612 TABLE DATA secrets supabase_admin
pg_restore: error: could not execute query: ERROR:  relation "vault.secrets" does not exist
Command was: COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
pg_restore: executing SEQUENCE SET refresh_tokens_id_seq
pg_restore: executing SEQUENCE SET subscription_id_seq
pg_restore: creating CONSTRAINT "auth.mfa_amr_claims amr_id_pk"
pg_restore: creating CONSTRAINT "auth.audit_log_entries audit_log_entries_pkey"
pg_restore: creating CONSTRAINT "auth.custom_oauth_providers custom_oauth_providers_identifier_key"
pg_restore: creating CONSTRAINT "auth.custom_oauth_providers custom_oauth_providers_pkey"
pg_restore: creating CONSTRAINT "auth.flow_state flow_state_pkey"
pg_restore: creating CONSTRAINT "auth.identities identities_pkey"
pg_restore: creating CONSTRAINT "auth.identities identities_provider_id_provider_unique"
pg_restore: creating CONSTRAINT "auth.instances instances_pkey"
pg_restore: creating CONSTRAINT "auth.mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey"
pg_restore: creating CONSTRAINT "auth.mfa_challenges mfa_challenges_pkey"
pg_restore: creating CONSTRAINT "auth.mfa_factors mfa_factors_last_challenged_at_key"
pg_restore: creating CONSTRAINT "auth.mfa_factors mfa_factors_pkey"
pg_restore: creating CONSTRAINT "auth.oauth_authorizations oauth_authorizations_authorization_code_key"
pg_restore: creating CONSTRAINT "auth.oauth_authorizations oauth_authorizations_authorization_id_key"
pg_restore: creating CONSTRAINT "auth.oauth_authorizations oauth_authorizations_pkey"
pg_restore: creating CONSTRAINT "auth.oauth_client_states oauth_client_states_pkey"
pg_restore: creating CONSTRAINT "auth.oauth_clients oauth_clients_pkey"
pg_restore: creating CONSTRAINT "auth.oauth_consents oauth_consents_pkey"
pg_restore: creating CONSTRAINT "auth.oauth_consents oauth_consents_user_client_unique"
pg_restore: creating CONSTRAINT "auth.one_time_tokens one_time_tokens_pkey"
pg_restore: creating CONSTRAINT "auth.refresh_tokens refresh_tokens_pkey"
pg_restore: creating CONSTRAINT "auth.refresh_tokens refresh_tokens_token_unique"
pg_restore: creating CONSTRAINT "auth.saml_providers saml_providers_entity_id_key"
pg_restore: creating CONSTRAINT "auth.saml_providers saml_providers_pkey"
pg_restore: creating CONSTRAINT "auth.saml_relay_states saml_relay_states_pkey"
pg_restore: creating CONSTRAINT "auth.schema_migrations schema_migrations_pkey"
pg_restore: creating CONSTRAINT "auth.sessions sessions_pkey"
pg_restore: creating CONSTRAINT "auth.sso_domains sso_domains_pkey"
pg_restore: creating CONSTRAINT "auth.sso_providers sso_providers_pkey"
pg_restore: creating CONSTRAINT "auth.users users_phone_key"
pg_restore: creating CONSTRAINT "auth.users users_pkey"
pg_restore: creating CONSTRAINT "auth.webauthn_challenges webauthn_challenges_pkey"
pg_restore: creating CONSTRAINT "auth.webauthn_credentials webauthn_credentials_pkey"
pg_restore: creating CONSTRAINT "public.AdminSession AdminSession_pkey"
pg_restore: creating CONSTRAINT "public.AdminUser AdminUser_pkey"
pg_restore: creating CONSTRAINT "public.AffiliateCommission AffiliateCommission_pkey"
pg_restore: creating CONSTRAINT "public.AffiliatePayoutProfile AffiliatePayoutProfile_pkey"
pg_restore: creating CONSTRAINT "public.AffiliateSettings AffiliateSettings_pkey"
pg_restore: creating CONSTRAINT "public.AffiliateWithdrawal AffiliateWithdrawal_pkey"
pg_restore: creating CONSTRAINT "public.AppSettings AppSettings_pkey"
pg_restore: creating CONSTRAINT "public.CatalogEpisode CatalogEpisode_pkey"
pg_restore: creating CONSTRAINT "public.CatalogEpisode CatalogEpisode_seriesId_episodeIndex_key"
pg_restore: creating CONSTRAINT "public.CatalogLanguage CatalogLanguage_pkey"
pg_restore: creating CONSTRAINT "public.CatalogLanguage CatalogLanguage_platformId_code_key"
pg_restore: creating CONSTRAINT "public.CatalogPlatform CatalogPlatform_pkey"
pg_restore: creating CONSTRAINT "public.CatalogSeries CatalogSeries_pkey"
pg_restore: creating CONSTRAINT "public.CatalogSeries CatalogSeries_platformId_languageId_upstreamSeriesId_key"
pg_restore: creating CONSTRAINT "public.CatalogSyncJob CatalogSyncJob_pkey"
pg_restore: creating CONSTRAINT "public.CatalogSyncState CatalogSyncState_pkey"
pg_restore: creating CONSTRAINT "public.CatalogSyncState CatalogSyncState_seriesId_key"
pg_restore: creating CONSTRAINT "public.CatalogSyncState CatalogSyncState_tabId_key"
pg_restore: creating CONSTRAINT "public.CatalogTabSeries CatalogTabSeries_pkey"
pg_restore: creating CONSTRAINT "public.CatalogTabSeries CatalogTabSeries_tabId_seriesId_key"
pg_restore: creating CONSTRAINT "public.CatalogTab CatalogTab_languageId_type_positionIndex_sortOrder_key"
pg_restore: creating CONSTRAINT "public.CatalogTab CatalogTab_pkey"
pg_restore: creating CONSTRAINT "public.DramaChannelBroadcast DramaChannelBroadcast_pkey"
pg_restore: creating CONSTRAINT "public.DramaFeed DramaFeed_pkey"
pg_restore: creating CONSTRAINT "public.Drama Drama_pkey"
pg_restore: creating CONSTRAINT "public.FavoriteDrama FavoriteDrama_pkey"
pg_restore: creating CONSTRAINT "public.PaymentGatewayConfig PaymentGatewayConfig_pkey"
pg_restore: creating CONSTRAINT "public.PaymentGatewaySettings PaymentGatewaySettings_pkey"
pg_restore: creating CONSTRAINT "public.ProviderRuntimeControl ProviderRuntimeControl_pkey"
pg_restore: creating CONSTRAINT "public.ProviderSyncJob ProviderSyncJob_pkey"
pg_restore: creating CONSTRAINT "public.ProviderWorkerLog ProviderWorkerLog_pkey"
pg_restore: creating CONSTRAINT "public.SavedEpisode SavedEpisode_pkey"
pg_restore: creating CONSTRAINT "public.TelegramPartnerBot TelegramPartnerBot_pkey"
pg_restore: creating CONSTRAINT "public.UserSession UserSession_pkey"
pg_restore: creating CONSTRAINT "public.User User_pkey"
pg_restore: creating CONSTRAINT "public.VipPayment VipPayment_pkey"
pg_restore: creating CONSTRAINT "public.VipPricePlan VipPricePlan_pkey"
pg_restore: creating CONSTRAINT "public.VipSettings VipSettings_pkey"
pg_restore: creating CONSTRAINT "public.WatchHistory WatchHistory_pkey"
pg_restore: creating CONSTRAINT "public._prisma_migrations _prisma_migrations_pkey"
pg_restore: creating CONSTRAINT "realtime.messages messages_pkey"
pg_restore: creating CONSTRAINT "realtime.subscription pk_subscription"
pg_restore: creating CONSTRAINT "realtime.schema_migrations schema_migrations_pkey"
pg_restore: creating CONSTRAINT "storage.buckets_analytics buckets_analytics_pkey"
pg_restore: creating CONSTRAINT "storage.buckets buckets_pkey"
pg_restore: creating CONSTRAINT "storage.buckets_vectors buckets_vectors_pkey"
pg_restore: creating CONSTRAINT "storage.migrations migrations_name_key"
pg_restore: creating CONSTRAINT "storage.migrations migrations_pkey"
pg_restore: creating CONSTRAINT "storage.objects objects_pkey"
pg_restore: creating CONSTRAINT "storage.s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey"
pg_restore: creating CONSTRAINT "storage.s3_multipart_uploads s3_multipart_uploads_pkey"
pg_restore: creating CONSTRAINT "storage.vector_indexes vector_indexes_pkey"
pg_restore: creating INDEX "auth.audit_logs_instance_id_idx"
pg_restore: creating INDEX "auth.confirmation_token_idx"
pg_restore: creating INDEX "auth.custom_oauth_providers_created_at_idx"
pg_restore: creating INDEX "auth.custom_oauth_providers_enabled_idx"
pg_restore: creating INDEX "auth.custom_oauth_providers_identifier_idx"
pg_restore: creating INDEX "auth.custom_oauth_providers_provider_type_idx"
pg_restore: creating INDEX "auth.email_change_token_current_idx"
pg_restore: creating INDEX "auth.email_change_token_new_idx"
pg_restore: creating INDEX "auth.factor_id_created_at_idx"
pg_restore: creating INDEX "auth.flow_state_created_at_idx"
pg_restore: creating INDEX "auth.identities_email_idx"
pg_restore: creating COMMENT "auth.INDEX identities_email_idx"
pg_restore: creating INDEX "auth.identities_user_id_idx"
pg_restore: creating INDEX "auth.idx_auth_code"
pg_restore: creating INDEX "auth.idx_oauth_client_states_created_at"
pg_restore: creating INDEX "auth.idx_user_id_auth_method"
pg_restore: creating INDEX "auth.idx_users_created_at_desc"
pg_restore: creating INDEX "auth.idx_users_email"
pg_restore: creating INDEX "auth.idx_users_last_sign_in_at_desc"
pg_restore: creating INDEX "auth.idx_users_name"
pg_restore: creating INDEX "auth.mfa_challenge_created_at_idx"
pg_restore: creating INDEX "auth.mfa_factors_user_friendly_name_unique"
pg_restore: creating INDEX "auth.mfa_factors_user_id_idx"
pg_restore: creating INDEX "auth.oauth_auth_pending_exp_idx"
pg_restore: creating INDEX "auth.oauth_clients_deleted_at_idx"
pg_restore: creating INDEX "auth.oauth_consents_active_client_idx"
pg_restore: creating INDEX "auth.oauth_consents_active_user_client_idx"
pg_restore: creating INDEX "auth.oauth_consents_user_order_idx"
pg_restore: creating INDEX "auth.one_time_tokens_relates_to_hash_idx"
pg_restore: creating INDEX "auth.one_time_tokens_token_hash_hash_idx"
pg_restore: creating INDEX "auth.one_time_tokens_user_id_token_type_key"
pg_restore: creating INDEX "auth.reauthentication_token_idx"
pg_restore: creating INDEX "auth.recovery_token_idx"
pg_restore: creating INDEX "auth.refresh_tokens_instance_id_idx"
pg_restore: creating INDEX "auth.refresh_tokens_instance_id_user_id_idx"
pg_restore: creating INDEX "auth.refresh_tokens_parent_idx"
pg_restore: creating INDEX "auth.refresh_tokens_session_id_revoked_idx"
pg_restore: creating INDEX "auth.refresh_tokens_updated_at_idx"
pg_restore: creating INDEX "auth.saml_providers_sso_provider_id_idx"
pg_restore: creating INDEX "auth.saml_relay_states_created_at_idx"
pg_restore: creating INDEX "auth.saml_relay_states_for_email_idx"
pg_restore: creating INDEX "auth.saml_relay_states_sso_provider_id_idx"
pg_restore: creating INDEX "auth.sessions_not_after_idx"
pg_restore: creating INDEX "auth.sessions_oauth_client_id_idx"
pg_restore: creating INDEX "auth.sessions_user_id_idx"
pg_restore: creating INDEX "auth.sso_domains_domain_idx"
pg_restore: creating INDEX "auth.sso_domains_sso_provider_id_idx"
pg_restore: creating INDEX "auth.sso_providers_resource_id_idx"
pg_restore: creating INDEX "auth.sso_providers_resource_id_pattern_idx"
pg_restore: creating INDEX "auth.unique_phone_factor_per_user"
pg_restore: creating INDEX "auth.user_id_created_at_idx"
pg_restore: creating INDEX "auth.users_email_partial_key"
pg_restore: creating COMMENT "auth.INDEX users_email_partial_key"
pg_restore: creating INDEX "auth.users_instance_id_email_idx"
pg_restore: creating INDEX "auth.users_instance_id_idx"
pg_restore: creating INDEX "auth.users_is_anonymous_idx"
pg_restore: creating INDEX "auth.webauthn_challenges_expires_at_idx"
pg_restore: creating INDEX "auth.webauthn_challenges_user_id_idx"
pg_restore: creating INDEX "auth.webauthn_credentials_credential_id_key"
pg_restore: creating INDEX "auth.webauthn_credentials_user_id_idx"
pg_restore: creating INDEX "public.AdminSession_adminUserId_expiresAt_idx"
pg_restore: creating INDEX "public.AdminSession_tokenHash_key"
pg_restore: creating INDEX "public.AdminUser_email_key"
pg_restore: creating INDEX "public.AffiliateCommission_affiliateUserId_status_createdAt_idx"
pg_restore: creating INDEX "public.AffiliateCommission_partnerBotId_createdAt_idx"
pg_restore: creating INDEX "public.AffiliateCommission_referredUserId_createdAt_idx"
pg_restore: creating INDEX "public.AffiliateCommission_vipPaymentId_key"
pg_restore: creating INDEX "public.AffiliatePayoutProfile_userId_key"
pg_restore: creating INDEX "public.AffiliateWithdrawal_affiliateUserId_status_createdAt_idx"
pg_restore: creating INDEX "public.CatalogEpisode_seriesId_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogEpisode_seriesId_upstreamEpisodeId_idx"
pg_restore: creating INDEX "public.CatalogLanguage_platformId_isActive_idx"
pg_restore: creating INDEX "public.CatalogSeries_catalogSource_isHomepageVisible_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogSeries_isHomepageVisible_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogSeries_platformId_languageId_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogSeries_title_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogSyncJob_languageCode_createdAt_idx"
pg_restore: creating INDEX "public.CatalogSyncJob_status_leaseExpiresAt_idx"
pg_restore: creating INDEX "public.CatalogSyncJob_status_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogSyncState_scope_status_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogTabSeries_seriesId_updatedAt_idx"
pg_restore: creating INDEX "public.CatalogTabSeries_tabId_rank_idx"
pg_restore: creating INDEX "public.CatalogTab_platformId_languageId_isActive_idx"
pg_restore: creating INDEX "public.CatalogTab_type_sortOrder_idx"
pg_restore: creating INDEX "public.DramaChannelBroadcast_botKind_createdAt_idx"
pg_restore: creating INDEX "public.DramaChannelBroadcast_dramaId_createdAt_idx"
pg_restore: creating INDEX "public.DramaChannelBroadcast_ownerUserId_createdAt_idx"
pg_restore: creating INDEX "public.DramaChannelBroadcast_partnerBotId_createdAt_idx"
pg_restore: creating INDEX "public.DramaChannelBroadcast_seriesId_createdAt_idx"
pg_restore: creating INDEX "public.DramaFeed_dramaId_source_key"
pg_restore: creating INDEX "public.DramaFeed_source_updatedAt_idx"
pg_restore: creating INDEX "public.Drama_isStreamPlayable_updatedAt_idx"
pg_restore: creating INDEX "public.Drama_providerName_providerDramaId_key"
pg_restore: creating INDEX "public.Drama_providerName_updatedAt_idx"
pg_restore: creating INDEX "public.FavoriteDrama_userId_createdAt_idx"
pg_restore: creating INDEX "public.FavoriteDrama_userId_dramaId_key"
pg_restore: creating INDEX "public.FavoriteDrama_userId_seriesId_key"
pg_restore: creating INDEX "public.PaymentGatewayConfig_provider_key"
pg_restore: creating INDEX "public.ProviderRuntimeControl_isHomepageVisible_providerName_idx"
pg_restore: creating INDEX "public.ProviderSyncJob_claim_queued_idx"
pg_restore: creating INDEX "public.ProviderSyncJob_providerCode_status_createdAt_idx"
pg_restore: creating INDEX "public.ProviderSyncJob_status_scheduledAt_priority_idx"
pg_restore: creating INDEX "public.ProviderWorkerLog_createdAt_idx"
pg_restore: creating INDEX "public.ProviderWorkerLog_jobId_idx"
pg_restore: creating INDEX "public.SavedEpisode_dramaId_updatedAt_idx"
pg_restore: creating INDEX "public.SavedEpisode_seriesId_updatedAt_idx"
pg_restore: creating INDEX "public.SavedEpisode_userId_dramaId_episodeIndex_key"
pg_restore: creating INDEX "public.SavedEpisode_userId_seriesId_episodeIndex_key"
pg_restore: creating INDEX "public.SavedEpisode_userId_updatedAt_idx"
pg_restore: creating INDEX "public.TelegramPartnerBot_botUsername_key"
pg_restore: creating INDEX "public.TelegramPartnerBot_ownerUserId_isEnabled_idx"
pg_restore: creating INDEX "public.UserSession_tokenHash_key"
pg_restore: creating INDEX "public.UserSession_userId_expiresAt_idx"
pg_restore: creating INDEX "public.User_affiliateCode_key"
pg_restore: creating INDEX "public.User_email_key"
pg_restore: creating INDEX "public.User_referredById_createdAt_idx"
pg_restore: creating INDEX "public.User_referredByPartnerBotId_createdAt_idx"
pg_restore: creating INDEX "public.User_telegramId_key"
pg_restore: creating INDEX "public.VipPayment_providerTransactionId_key"
pg_restore: creating INDEX "public.VipPayment_referenceId_key"
pg_restore: creating INDEX "public.VipPayment_userId_status_createdAt_idx"
pg_restore: creating INDEX "public.VipPayment_vipPricePlanId_createdAt_idx"
pg_restore: creating INDEX "public.VipPricePlan_isActive_sortOrder_idx"
pg_restore: creating INDEX "public.VipPricePlan_slug_key"
pg_restore: creating INDEX "public.WatchHistory_dramaId_updatedAt_idx"
pg_restore: creating INDEX "public.WatchHistory_seriesId_updatedAt_idx"
pg_restore: creating INDEX "public.WatchHistory_userId_dramaId_key"
pg_restore: creating INDEX "public.WatchHistory_userId_seriesId_key"
pg_restore: creating INDEX "public.WatchHistory_userId_updatedAt_idx"
pg_restore: creating INDEX "realtime.ix_realtime_subscription_entity"
pg_restore: creating INDEX "realtime.messages_inserted_at_topic_index"
pg_restore: creating INDEX "realtime.subscription_subscription_id_entity_filters_action_filter_key"
pg_restore: creating INDEX "storage.bname"
pg_restore: creating INDEX "storage.bucketid_objname"
pg_restore: creating INDEX "storage.buckets_analytics_unique_name_idx"
pg_restore: creating INDEX "storage.idx_multipart_uploads_list"
pg_restore: creating INDEX "storage.idx_objects_bucket_id_name"
pg_restore: creating INDEX "storage.idx_objects_bucket_id_name_lower"
pg_restore: creating INDEX "storage.name_prefix_search"
pg_restore: creating INDEX "storage.vector_indexes_name_bucket_id_idx"
pg_restore: creating TRIGGER "realtime.subscription tr_check_filters"
pg_restore: creating TRIGGER "storage.buckets enforce_bucket_name_length_trigger"
pg_restore: creating TRIGGER "storage.buckets protect_buckets_delete"
pg_restore: creating TRIGGER "storage.objects protect_objects_delete"
pg_restore: creating TRIGGER "storage.objects update_objects_updated_at"
pg_restore: creating FK CONSTRAINT "auth.identities identities_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.mfa_amr_claims mfa_amr_claims_session_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.mfa_challenges mfa_challenges_auth_factor_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.mfa_factors mfa_factors_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.oauth_authorizations oauth_authorizations_client_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.oauth_authorizations oauth_authorizations_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.oauth_consents oauth_consents_client_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.oauth_consents oauth_consents_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.one_time_tokens one_time_tokens_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.refresh_tokens refresh_tokens_session_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.saml_providers saml_providers_sso_provider_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.saml_relay_states saml_relay_states_flow_state_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.saml_relay_states saml_relay_states_sso_provider_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.sessions sessions_oauth_client_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.sessions sessions_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.sso_domains sso_domains_sso_provider_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.webauthn_challenges webauthn_challenges_user_id_fkey"
pg_restore: creating FK CONSTRAINT "auth.webauthn_credentials webauthn_credentials_user_id_fkey"
pg_restore: creating FK CONSTRAINT "public.AdminSession AdminSession_adminUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliateCommission AffiliateCommission_affiliateUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliateCommission AffiliateCommission_partnerBotId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliateCommission AffiliateCommission_referredUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliateCommission AffiliateCommission_vipPaymentId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliatePayoutProfile AffiliatePayoutProfile_userId_fkey"
pg_restore: creating FK CONSTRAINT "public.AffiliateWithdrawal AffiliateWithdrawal_affiliateUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogEpisode CatalogEpisode_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogLanguage CatalogLanguage_platformId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogSeries CatalogSeries_languageId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogSeries CatalogSeries_platformId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogSyncState CatalogSyncState_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogSyncState CatalogSyncState_tabId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogTabSeries CatalogTabSeries_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogTabSeries CatalogTabSeries_tabId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogTab CatalogTab_languageId_fkey"
pg_restore: creating FK CONSTRAINT "public.CatalogTab CatalogTab_platformId_fkey"
pg_restore: creating FK CONSTRAINT "public.DramaChannelBroadcast DramaChannelBroadcast_dramaId_fkey"
pg_restore: creating FK CONSTRAINT "public.DramaChannelBroadcast DramaChannelBroadcast_ownerUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.DramaChannelBroadcast DramaChannelBroadcast_partnerBotId_fkey"
pg_restore: creating FK CONSTRAINT "public.DramaChannelBroadcast DramaChannelBroadcast_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.DramaFeed DramaFeed_dramaId_fkey"
pg_restore: creating FK CONSTRAINT "public.FavoriteDrama FavoriteDrama_dramaId_fkey"
pg_restore: creating FK CONSTRAINT "public.FavoriteDrama FavoriteDrama_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.FavoriteDrama FavoriteDrama_userId_fkey"
pg_restore: creating FK CONSTRAINT "public.SavedEpisode SavedEpisode_dramaId_fkey"
pg_restore: creating FK CONSTRAINT "public.SavedEpisode SavedEpisode_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.SavedEpisode SavedEpisode_userId_fkey"
pg_restore: creating FK CONSTRAINT "public.TelegramPartnerBot TelegramPartnerBot_ownerUserId_fkey"
pg_restore: creating FK CONSTRAINT "public.UserSession UserSession_userId_fkey"
pg_restore: creating FK CONSTRAINT "public.User User_referredById_fkey"
pg_restore: creating FK CONSTRAINT "public.User User_referredByPartnerBotId_fkey"
pg_restore: creating FK CONSTRAINT "public.VipPayment VipPayment_userId_fkey"
pg_restore: creating FK CONSTRAINT "public.VipPayment VipPayment_vipPricePlanId_fkey"
pg_restore: creating FK CONSTRAINT "public.WatchHistory WatchHistory_dramaId_fkey"
pg_restore: creating FK CONSTRAINT "public.WatchHistory WatchHistory_seriesId_fkey"
pg_restore: creating FK CONSTRAINT "public.WatchHistory WatchHistory_userId_fkey"
pg_restore: creating FK CONSTRAINT "storage.objects objects_bucketId_fkey"
pg_restore: creating FK CONSTRAINT "storage.s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey"
pg_restore: creating FK CONSTRAINT "storage.s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey"
pg_restore: creating FK CONSTRAINT "storage.s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey"
pg_restore: creating FK CONSTRAINT "storage.vector_indexes vector_indexes_bucket_id_fkey"
pg_restore: creating ROW SECURITY "auth.audit_log_entries"
pg_restore: creating ROW SECURITY "auth.flow_state"
pg_restore: creating ROW SECURITY "auth.identities"
pg_restore: creating ROW SECURITY "auth.instances"
pg_restore: creating ROW SECURITY "auth.mfa_amr_claims"
pg_restore: creating ROW SECURITY "auth.mfa_challenges"
pg_restore: creating ROW SECURITY "auth.mfa_factors"
pg_restore: creating ROW SECURITY "auth.one_time_tokens"
pg_restore: creating ROW SECURITY "auth.refresh_tokens"
pg_restore: creating ROW SECURITY "auth.saml_providers"
pg_restore: creating ROW SECURITY "auth.saml_relay_states"
pg_restore: creating ROW SECURITY "auth.schema_migrations"
pg_restore: creating ROW SECURITY "auth.sessions"
pg_restore: creating ROW SECURITY "auth.sso_domains"
pg_restore: creating ROW SECURITY "auth.sso_providers"
pg_restore: creating ROW SECURITY "auth.users"
pg_restore: creating ROW SECURITY "realtime.messages"
pg_restore: creating ROW SECURITY "storage.buckets"
pg_restore: creating ROW SECURITY "storage.buckets_analytics"
pg_restore: creating ROW SECURITY "storage.buckets_vectors"
pg_restore: creating ROW SECURITY "storage.migrations"
pg_restore: creating ROW SECURITY "storage.objects"
pg_restore: creating ROW SECURITY "storage.s3_multipart_uploads"
pg_restore: creating ROW SECURITY "storage.s3_multipart_uploads_parts"
pg_restore: creating ROW SECURITY "storage.vector_indexes"
pg_restore: creating PUBLICATION "supabase_realtime"
pg_restore: WARNING:  wal_level is insufficient to publish logical changes
HINT:  Set wal_level to "logical" before creating subscriptions.
pg_restore: creating PUBLICATION TABLE "public.supabase_realtime Drama"
pg_restore: creating PUBLICATION TABLE "public.supabase_realtime DramaFeed"
pg_restore: creating PUBLICATION TABLE "public.supabase_realtime User"
pg_restore: creating PUBLICATION TABLE "public.supabase_realtime UserSession"
pg_restore: creating EVENT TRIGGER "issue_graphql_placeholder"
pg_restore: from TOC entry 3858; 3466 16575 EVENT TRIGGER issue_graphql_placeholder supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "issue_graphql_placeholder"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


pg_restore: creating EVENT TRIGGER "issue_pg_cron_access"
pg_restore: from TOC entry 3861; 3466 16654 EVENT TRIGGER issue_pg_cron_access supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "issue_pg_cron_access"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


pg_restore: creating EVENT TRIGGER "issue_pg_graphql_access"
pg_restore: from TOC entry 3857; 3466 16573 EVENT TRIGGER issue_pg_graphql_access supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "issue_pg_graphql_access"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


pg_restore: creating EVENT TRIGGER "issue_pg_net_access"
pg_restore: from TOC entry 3862; 3466 16657 EVENT TRIGGER issue_pg_net_access supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "issue_pg_net_access"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


pg_restore: creating EVENT TRIGGER "pgrst_ddl_watch"
pg_restore: from TOC entry 3859; 3466 16576 EVENT TRIGGER pgrst_ddl_watch supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "pgrst_ddl_watch"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


pg_restore: creating EVENT TRIGGER "pgrst_drop_watch"
pg_restore: from TOC entry 3860; 3466 16577 EVENT TRIGGER pgrst_drop_watch supabase_admin
pg_restore: error: could not execute query: ERROR:  permission denied to create event trigger "pgrst_drop_watch"
HINT:  Must be superuser to create an event trigger.
Command was: CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


pg_restore: warning: errors ignored on restore: 13