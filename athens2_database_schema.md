# Athens 2.0 Database Schema
# Generated: 2026-02-20 11:34:23.840686


## Table: athens_audit_logs
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| action | character varying | NO | - |
| entity_type | character varying | NO | - |
| entity_id | character varying | NO | - |
| before_data | jsonb | YES | - |
| after_data | jsonb | YES | - |
| ip_address | inet | YES | - |
| user_agent | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| actor_id | bigint | YES | - |

**Indexes:**
- athens_audit_logs_actor_id_3e2f5235
- athens_audit_logs_pkey

## Table: athens_module_subscriptions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| module_code | character varying | NO | - |
| enabled | boolean | NO | - |
| plan_tier | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| tenant_id | bigint | NO | - |

**Indexes:**
- athens_module_subscriptions_pkey
- athens_module_subscriptions_tenant_id_25ea938e
- athens_module_subscriptions_tenant_id_module_code_d748e683_uniq

## Table: athens_tenant_links
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| enabled_modules | jsonb | NO | - |
| enabled_menus | jsonb | NO | - |
| is_active | boolean | NO | - |
| synced_at | timestamp with time zone | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| tenant_id | bigint | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- athens_tenant_links_created_by_id_ba8a0791
- athens_tenant_links_pkey
- athens_tenant_links_tenant_id_key

## Table: auth_group
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | - |
| name | character varying | NO | - |

**Indexes:**
- auth_group_name_a6ea08ec_like
- auth_group_name_key
- auth_group_pkey

## Table: auth_group_permissions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| group_id | integer | NO | - |
| permission_id | integer | NO | - |

**Indexes:**
- auth_group_permissions_group_id_b120cbf9
- auth_group_permissions_group_id_permission_id_0cd325b0_uniq
- auth_group_permissions_permission_id_84c5c92e
- auth_group_permissions_pkey

## Table: auth_permission
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | - |
| name | character varying | NO | - |
| content_type_id | integer | NO | - |
| codename | character varying | NO | - |

**Indexes:**
- auth_permission_content_type_id_2f476e4b
- auth_permission_content_type_id_codename_01ab375a_uniq
- auth_permission_pkey

## Table: authentication_project
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | uuid | YES | - |
| client_company_id | uuid | YES | - |
| projectName | character varying | NO | - |
| projectCategory | character varying | NO | - |
| capacity | character varying | NO | - |
| location | character varying | NO | - |
| latitude | double precision | YES | - |
| longitude | double precision | YES | - |
| nearestPoliceStation | character varying | NO | - |
| nearestPoliceStationContact | character varying | NO | - |
| nearestHospital | character varying | NO | - |
| nearestHospitalContact | character varying | NO | - |
| commencementDate | date | YES | - |
| deadlineDate | date | YES | - |
| subscriber_role | character varying | NO | - |

**Indexes:**
- authentication_project_pkey

## Table: contract_labour_deployment
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| branch_id | integer | NO | - |
| wage_rate | numeric | NO | - |
| deployment_start | date | NO | - |
| deployment_end | date | YES | - |
| status | character varying | NO | - |
| work_order_number | character varying | NO | - |
| work_order_date | date | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| contractor_compliance_id | bigint | NO | - |
| employee_id | bigint | NO | - |
| project_id | bigint | NO | - |

**Indexes:**
- contract_la_athens__idx
- contract_la_contrac_idx
- contract_la_deploym_idx
- contract_la_project_idx
- contract_labour_deployment_athens_tenant_id_43375740
- contract_labour_deployment_contractor_compliance_id_ed9fe64f
- contract_labour_deployment_employee_id_2c5513a2
- contract_labour_deployment_pkey
- contract_labour_deployment_project_id_45a84d57

## Table: contractor_compliance
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| branch_id | integer | NO | - |
| clra_license_number | character varying | NO | - |
| license_valid_from | date | NO | - |
| license_valid_to | date | NO | - |
| max_worker_limit | integer | NO | - |
| pf_code | character varying | NO | - |
| esi_code | character varying | NO | - |
| labour_registration_number | character varying | NO | - |
| last_return_filed | date | YES | - |
| is_compliant | boolean | NO | - |
| compliance_notes | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| contractor_id | bigint | NO | - |

**Indexes:**
- contractor_c_complia_idx
- contractor_c_license_idx
- contractor_compliance_contractor_id_addf5a4f
- contractor_compliance_contractor_id_branch_id_f3023d66_uniq
- contractor_compliance_pkey

## Table: contractor_master
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| company_type | character varying | NO | - |
| company_name | character varying | NO | - |
| company_address | text | NO | - |
| contact_person | character varying | NO | - |
| contact_number | character varying | NO | - |
| email | character varying | NO | - |
| pan_number | character varying | NO | - |
| gst_number | character varying | NO | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |

**Indexes:**
- contractor_m_athens__idx
- contractor_m_company_idx
- contractor_m_email_idx
- contractor_master_athens_tenant_id_891b8018
- contractor_master_athens_tenant_id_company_name_5e5ec1b4_uniq
- contractor_master_pkey

## Table: django_admin_log
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | - |
| action_time | timestamp with time zone | NO | - |
| object_id | text | YES | - |
| object_repr | character varying | NO | - |
| action_flag | smallint | NO | - |
| change_message | text | NO | - |
| content_type_id | integer | YES | - |
| user_id | bigint | NO | - |

**Indexes:**
- django_admin_log_content_type_id_c4bce8eb
- django_admin_log_pkey
- django_admin_log_user_id_c564eba6

## Table: django_content_type
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | - |
| app_label | character varying | NO | - |
| model | character varying | NO | - |

**Indexes:**
- django_content_type_app_label_model_76bd3d3b_uniq
- django_content_type_pkey

## Table: django_migrations
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| app | character varying | NO | - |
| name | character varying | NO | - |
| applied | timestamp with time zone | NO | - |

**Indexes:**
- django_migrations_pkey

## Table: django_session
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| session_key | character varying | NO | - |
| session_data | text | NO | - |
| expire_date | timestamp with time zone | NO | - |

**Indexes:**
- django_session_expire_date_a5c62663
- django_session_pkey
- django_session_session_key_c0390e0f_like

## Table: ergon_advance
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| amount | numeric | NO | - |
| purpose | text | NO | - |
| status | character varying | NO | - |
| requested_date | date | NO | - |
| approved_date | date | YES | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |
| project_id | bigint | YES | - |

**Indexes:**
- ergon_advance_athens_tenant_id_8f26feb4
- ergon_advance_employee_id_2c959f9e
- ergon_advance_pkey
- ergon_advance_project_id_ead38f7b

## Table: ergon_customer
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| email | character varying | NO | - |
| phone | character varying | NO | - |
| address | text | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- ergon_customer_athens_tenant_id_3c214cfa
- ergon_customer_pkey

## Table: ergon_expense
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| category | character varying | NO | - |
| amount | numeric | NO | - |
| description | text | NO | - |
| expense_date | date | NO | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |
| project_id | bigint | YES | - |

**Indexes:**
- ergon_expense_athens_tenant_id_5319646a
- ergon_expense_employee_id_7871d8e6
- ergon_expense_pkey
- ergon_expense_project_id_26cdeaba

## Table: ergon_invoice
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| invoice_number | character varying | NO | - |
| total_amount | numeric | NO | - |
| status | character varying | NO | - |
| due_date | date | NO | - |
| created_at | timestamp with time zone | NO | - |
| customer_id | bigint | NO | - |
| project_id | bigint | YES | - |

**Indexes:**
- ergon_invoice_athens_tenant_id_99ed1263
- ergon_invoice_customer_id_c93c56bc
- ergon_invoice_invoice_number_7103948f_like
- ergon_invoice_invoice_number_key
- ergon_invoice_pkey
- ergon_invoice_project_id_bef2f63b

## Table: ergon_ledger
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| entry_type | character varying | NO | - |
| category | character varying | NO | - |
| amount | numeric | NO | - |
| description | text | NO | - |
| entry_date | date | NO | - |
| created_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |
| project_id | bigint | YES | - |

**Indexes:**
- ergon_ledge_athens__26dcd1_idx
- ergon_ledger_athens_tenant_id_ba3f6f71
- ergon_ledger_created_by_id_03d0c0c1
- ergon_ledger_pkey
- ergon_ledger_project_id_e0c00f22

## Table: ergon_machinery
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| type | character varying | NO | - |
| registration_no | character varying | NO | - |
| daily_rate | numeric | YES | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- ergon_machinery_athens_tenant_id_f13d66a8
- ergon_machinery_pkey

## Table: ergon_manpower
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| role | character varying | NO | - |
| contact | character varying | NO | - |
| daily_rate | numeric | YES | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- ergon_manpower_athens_tenant_id_62a30842
- ergon_manpower_pkey

## Table: ergon_project
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| description | text | NO | - |
| status | character varying | NO | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| budget | numeric | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- ergon_proje_athens__117d33_idx
- ergon_project_athens_tenant_id_68870ad9
- ergon_project_created_by_id_db67fa07
- ergon_project_pkey

## Table: ergon_task
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| title | character varying | NO | - |
| description | text | NO | - |
| status | character varying | NO | - |
| priority | character varying | NO | - |
| due_date | date | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| assigned_to_id | bigint | YES | - |
| created_by_id | bigint | YES | - |
| project_id | bigint | NO | - |

**Indexes:**
- ergon_task_assigned_to_id_6b7be87b
- ergon_task_created_by_id_461f0491
- ergon_task_pkey
- ergon_task_project_id_beafddd1

## Table: project_memberships
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| role | character varying | NO | - |
| is_active | boolean | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |
| project_id | bigint | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- project_mem_project_a2a8fb_idx
- project_mem_user_id_746424_idx
- project_memberships_created_by_id_eaf3f2b5
- project_memberships_pkey
- project_memberships_project_id_d567ba4c
- project_memberships_project_id_user_id_94d17fd6_uniq
- project_memberships_user_id_9c87cc33

## Table: project_modules
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| project_id | integer | NO | - |
| athens_tenant_id | integer | NO | - |
| module_code | character varying | NO | - |
| is_enabled | boolean | NO | - |
| enabled_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| enabled_by_id | bigint | YES | - |

**Indexes:**
- project_mod_athens__f140ea_idx
- project_mod_project_93132e_idx
- project_modules_athens_tenant_id_38f15323
- project_modules_enabled_by_id_c131158b
- project_modules_pkey
- project_modules_project_id_763a5136
- project_modules_project_id_module_code_3e313fad_uniq

## Table: projects
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| name | character varying | NO | - |
| code | character varying | NO | - |
| status | character varying | NO | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| company_id | bigint | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- projects_code_4e8ee847
- projects_code_4e8ee847_like
- projects_code_7205ea_idx
- projects_company_c1ab17_idx
- projects_company_id_7ce6d1e3
- projects_company_id_code_e7dd118a_uniq
- projects_company_id_name_a64a343d_uniq
- projects_created_by_id_7e51a33d
- projects_pkey

## Table: security_logs
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| event_type | character varying | NO | - |
| severity | character varying | NO | - |
| company_id | integer | YES | - |
| ip_address | inet | YES | - |
| user_agent | text | YES | - |
| device_fingerprint | character varying | YES | - |
| metadata | jsonb | NO | - |
| created_at | timestamp with time zone | NO | - |
| user_id | bigint | YES | - |

**Indexes:**
- security_lo_company_a4ed05_idx
- security_lo_created_ab55c2_idx
- security_lo_event_t_25aa39_idx
- security_lo_user_id_7a8552_idx
- security_logs_company_id_aafdc986
- security_logs_created_at_09a144e5
- security_logs_pkey
- security_logs_user_id_6a983e12

## Table: service_user_sessions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| session_key | character varying | NO | - |
| company_id | integer | NO | - |
| ip_address | inet | YES | - |
| user_agent | text | YES | - |
| created_at | timestamp with time zone | NO | - |
| expires_at | timestamp with time zone | NO | - |
| last_activity | timestamp with time zone | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- service_use_session_d6f362_idx
- service_use_user_id_f44e82_idx
- service_user_sessions_company_id_0d86d428
- service_user_sessions_pkey
- service_user_sessions_session_key_1a0c2379_like
- service_user_sessions_session_key_key
- service_user_sessions_user_id_499c0d9b

## Table: services
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| name | character varying | NO | - |
| code | character varying | NO | - |
| description | text | NO | - |
| service_type | character varying | NO | - |
| base_url | character varying | NO | - |
| icon | character varying | NO | - |
| is_active | boolean | NO | - |
| features | jsonb | NO | - |
| pricing | jsonb | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |

**Indexes:**
- services_code_13d46a1e_like
- services_code_key
- services_name_73647d7e_like
- services_name_key
- services_pkey

## Table: subscriptions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| plan_name | character varying | NO | - |
| status | character varying | NO | - |
| valid_from | timestamp with time zone | NO | - |
| valid_until | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |
| tenant_id | bigint | NO | - |

**Indexes:**
- subscriptio_tenant__5476fe_idx
- subscriptions_created_by_id_e950b029
- subscriptions_pkey
- subscriptions_tenant_id_4275a0ca

## Table: superadmin_2fa_settings
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| enforce_for_all | boolean | NO | - |
| allow_backup_codes | boolean | NO | - |
| backup_codes_count | integer | NO | - |
| updated_at | timestamp with time zone | NO | - |
| updated_by_id | bigint | YES | - |

**Indexes:**
- superadmin_2fa_settings_pkey
- superadmin_2fa_settings_updated_by_id_fd9282cd

## Table: superadmin_2fa_settings_enforce_for_roles
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| twofactorsettings_id | bigint | NO | - |
| role_id | bigint | NO | - |

**Indexes:**
- superadmin_2fa_settings__twofactorsettings_id_rol_d8061041_uniq
- superadmin_2fa_settings_en_twofactorsettings_id_72ea1aac
- superadmin_2fa_settings_enforce_for_roles_pkey
- superadmin_2fa_settings_enforce_for_roles_role_id_930550ca

## Table: superadmin_announcements
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| title | character varying | NO | - |
| message | text | NO | - |
| type | character varying | NO | - |
| target_audience | character varying | NO | - |
| scheduled_at | timestamp with time zone | YES | - |
| expires_at | timestamp with time zone | YES | - |
| is_active | boolean | NO | - |
| created_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- superadmin_announcements_created_by_id_9a61ab53
- superadmin_announcements_pkey

## Table: superadmin_announcements_target_roles
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| announcement_id | bigint | NO | - |
| role_id | bigint | NO | - |

**Indexes:**
- superadmin_announcements_announcement_id_role_id_04fd7e79_uniq
- superadmin_announcements_target_roles_announcement_id_50ff0ba4
- superadmin_announcements_target_roles_pkey
- superadmin_announcements_target_roles_role_id_0e657b7c

## Table: superadmin_audit_logs
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| timestamp | timestamp with time zone | NO | - |
| action | character varying | NO | - |
| module | character varying | NO | - |
| resource_type | character varying | NO | - |
| resource_id | character varying | NO | - |
| ip_address | inet | YES | - |
| user_agent | text | NO | - |
| request_data | jsonb | NO | - |
| response_data | jsonb | NO | - |
| status | character varying | NO | - |
| user_id | bigint | YES | - |

**Indexes:**
- superadmin__action_ef8ab8_idx
- superadmin__module_5ac4c6_idx
- superadmin__timesta_5c61dc_idx
- superadmin__user_id_6f2a38_idx
- superadmin_audit_logs_action_82e9da79
- superadmin_audit_logs_action_82e9da79_like
- superadmin_audit_logs_module_f21ef0eb
- superadmin_audit_logs_module_f21ef0eb_like
- superadmin_audit_logs_pkey
- superadmin_audit_logs_timestamp_07cf4dc1
- superadmin_audit_logs_user_id_4728a619

## Table: superadmin_database_backups
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| filename | character varying | NO | - |
| file_path | character varying | NO | - |
| file_size | bigint | NO | - |
| backup_type | character varying | NO | - |
| status | character varying | NO | - |
| error_message | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| completed_at | timestamp with time zone | YES | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- superadmin_database_backups_created_by_id_02441f64
- superadmin_database_backups_pkey

## Table: superadmin_ip_restrictions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| ip_address | inet | NO | - |
| ip_range | character varying | NO | - |
| restriction_type | character varying | NO | - |
| description | text | NO | - |
| is_active | boolean | NO | - |
| created_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- superadmin__ip_addr_5c4386_idx
- superadmin_ip_restrictions_created_by_id_52a31605
- superadmin_ip_restrictions_pkey

## Table: superadmin_notification_deliveries
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| delivery_status | character varying | NO | - |
| delivered_at | timestamp with time zone | YES | - |
| read_at | timestamp with time zone | YES | - |
| announcement_id | bigint | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- superadmin__user_id_305cc7_idx
- superadmin_notification__announcement_id_user_id_470018ed_uniq
- superadmin_notification_deliveries_announcement_id_f3781c33
- superadmin_notification_deliveries_pkey
- superadmin_notification_deliveries_user_id_09646fdd

## Table: superadmin_password_policy
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| min_length | integer | NO | - |
| require_uppercase | boolean | NO | - |
| require_lowercase | boolean | NO | - |
| require_numbers | boolean | NO | - |
| require_special_chars | boolean | NO | - |
| expiry_days | integer | NO | - |
| history_count | integer | NO | - |
| lockout_threshold | integer | NO | - |
| lockout_duration | integer | NO | - |
| updated_at | timestamp with time zone | NO | - |
| updated_by_id | bigint | YES | - |

**Indexes:**
- superadmin_password_policy_pkey
- superadmin_password_policy_updated_by_id_79b9c388

## Table: superadmin_permissions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| codename | character varying | NO | - |
| name | character varying | NO | - |
| description | text | NO | - |
| module | character varying | NO | - |
| action | character varying | NO | - |

**Indexes:**
- superadmin__module_c3ad7d_idx
- superadmin_permissions_codename_b4f0b3bf_like
- superadmin_permissions_codename_key
- superadmin_permissions_module_32d41658
- superadmin_permissions_module_32d41658_like
- superadmin_permissions_pkey

## Table: superadmin_role_permissions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| created_at | timestamp with time zone | NO | - |
| permission_id | bigint | NO | - |
| role_id | bigint | NO | - |

**Indexes:**
- superadmin__role_id_754964_idx
- superadmin_role_permissions_permission_id_12f62e21
- superadmin_role_permissions_pkey
- superadmin_role_permissions_role_id_bc012521
- superadmin_role_permissions_role_id_permission_id_f9c90734_uniq

## Table: superadmin_roles
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| name | character varying | NO | - |
| description | text | NO | - |
| is_system_role | boolean | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |

**Indexes:**
- superadmin_roles_name_1c3c2263_like
- superadmin_roles_name_key
- superadmin_roles_pkey

## Table: superadmin_session_settings
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| timeout_minutes | integer | NO | - |
| max_concurrent_sessions | integer | NO | - |
| enable_device_tracking | boolean | NO | - |
| updated_at | timestamp with time zone | NO | - |
| updated_by_id | bigint | YES | - |

**Indexes:**
- superadmin_session_settings_pkey
- superadmin_session_settings_updated_by_id_36691767

## Table: superadmin_system_settings
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| system_name | character varying | NO | - |
| timezone | character varying | NO | - |
| date_format | character varying | NO | - |
| language | character varying | NO | - |
| maintenance_mode | boolean | NO | - |
| maintenance_message | text | NO | - |
| updated_at | timestamp with time zone | NO | - |
| updated_by_id | bigint | YES | - |

**Indexes:**
- superadmin_system_settings_pkey
- superadmin_system_settings_updated_by_id_a2dc8498

## Table: superadmin_user_roles
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| assigned_at | timestamp with time zone | NO | - |
| assigned_by_id | bigint | YES | - |
| role_id | bigint | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- superadmin__user_id_f1c6fd_idx
- superadmin_user_roles_assigned_by_id_21b5fe7b
- superadmin_user_roles_pkey
- superadmin_user_roles_role_id_b7682c2f
- superadmin_user_roles_user_id_7939d6aa
- superadmin_user_roles_user_id_role_id_7d027b6a_uniq

## Table: tenant_services
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| tier | character varying | NO | - |
| is_enabled | boolean | NO | - |
| credentials | jsonb | NO | - |
| config | jsonb | NO | - |
| enabled_at | timestamp with time zone | NO | - |
| disabled_at | timestamp with time zone | YES | - |
| created_by_id | bigint | YES | - |
| service_id | bigint | NO | - |
| tenant_id | bigint | NO | - |

**Indexes:**
- tenant_services_created_by_id_8e93f2d3
- tenant_services_pkey
- tenant_services_service_id_352d880f
- tenant_services_tenant_id_22543601
- tenant_services_tenant_id_service_id_f3bb1b63_uniq

## Table: tenants
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| name | character varying | NO | - |
| code | character varying | NO | - |
| is_active | boolean | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |
| admin_email | character varying | YES | - |
| contact_phone | character varying | YES | - |
| industry | character varying | YES | - |
| timezone | character varying | NO | - |

**Indexes:**
- tenants_code_a54984f8_like
- tenants_code_key
- tenants_created_by_id_ac6da4d6
- tenants_pkey

## Table: token_blacklist_blacklistedtoken
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| blacklisted_at | timestamp with time zone | NO | - |
| token_id | bigint | NO | - |

**Indexes:**
- token_blacklist_blacklistedtoken_pkey
- token_blacklist_blacklistedtoken_token_id_key

## Table: token_blacklist_outstandingtoken
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| token | text | NO | - |
| created_at | timestamp with time zone | YES | - |
| expires_at | timestamp with time zone | NO | - |
| user_id | bigint | YES | - |
| jti | character varying | NO | - |

**Indexes:**
- token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like
- token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq
- token_blacklist_outstandingtoken_pkey
- token_blacklist_outstandingtoken_user_id_83bc629a

## Table: users
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| password | character varying | NO | - |
| last_login | timestamp with time zone | YES | - |
| is_superuser | boolean | NO | - |
| email | character varying | NO | - |
| user_type | character varying | NO | - |
| company_id | integer | YES | - |
| is_active | boolean | NO | - |
| is_staff | boolean | NO | - |
| requires_2fa | boolean | NO | - |
| totp_secret | character varying | YES | - |
| password_changed_at | timestamp with time zone | YES | - |
| failed_login_count | integer | NO | - |
| locked_until | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| api_key | character varying | YES | - |
| admin_type | character varying | YES | - |
| created_by_id | bigint | YES | - |
| department | character varying | YES | - |
| designation | character varying | YES | - |
| grade | character varying | YES | - |
| name | character varying | YES | - |
| phone_number | character varying | YES | - |
| surname | character varying | YES | - |
| username | character varying | YES | - |
| project_id | bigint | YES | - |
| athens_tenant_id | uuid | YES | - |
| company_name | character varying | YES | - |
| registered_address | text | YES | - |
| is_autogenerated_password | boolean | NO | - |
| is_password_reset_required | boolean | NO | - |
| tenant_id | bigint | YES | - |
| company_logo | character varying | YES | - |

**Indexes:**
- users_api_key_a1b42ae5_like
- users_api_key_key
- users_athens_tenant_id_e46a3ebc
- users_company_c76839_idx
- users_company_id_23a5e9c4
- users_created_by_id_19a92469
- users_email_0ea73cca_like
- users_email_4b85f2_idx
- users_email_key
- users_pkey
- users_project_id_96b22232
- users_tenant_id_07f315ee
- users_user_ty_578f8f_idx
- users_username_e8658fc8_like
- users_username_key

## Table: users_groups
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| user_id | bigint | NO | - |
| group_id | integer | NO | - |

**Indexes:**
- users_groups_group_id_2f3517aa
- users_groups_pkey
- users_groups_user_id_f500bee5
- users_groups_user_id_group_id_fc7788e8_uniq

## Table: users_user_permissions
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| user_id | bigint | NO | - |
| permission_id | integer | NO | - |

**Indexes:**
- users_user_permissions_permission_id_6d08dcd2
- users_user_permissions_pkey
- users_user_permissions_user_id_92473840
- users_user_permissions_user_id_permission_id_3b86cbdf_uniq

## Table: workforce_advance
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| advance_date | date | NO | - |
| amount | numeric | NO | - |
| reason | text | NO | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |

**Indexes:**
- workforce_advance_athens_tenant_id_d5800d40
- workforce_advance_employee_id_056daa14
- workforce_advance_pkey

## Table: workforce_attendance
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| date | date | NO | - |
| in_time | time without time zone | YES | - |
| out_time | time without time zone | YES | - |
| status | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |
| overtime_hours | numeric | NO | - |
| total_hours | numeric | NO | - |
| shift_id | bigint | YES | - |

**Indexes:**
- workforce_a_athens__dbd1bb_idx
- workforce_attendance_athens_tenant_id_b72044b8
- workforce_attendance_employee_id_76b93065
- workforce_attendance_employee_id_date_3529b30c_uniq
- workforce_attendance_pkey
- workforce_attendance_shift_id_c5f8c8e1

## Table: workforce_bonus_record
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| accounting_year | character varying | NO | - |
| total_salary_for_year | numeric | NO | - |
| bonus_percentage | numeric | NO | - |
| bonus_amount | numeric | NO | - |
| payment_date | date | YES | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |

**Indexes:**
- workforce_bonus_record_athens_tenant_id_ab3fa4ab
- workforce_bonus_record_athens_tenant_id_account_c07c9666_uniq
- workforce_bonus_record_employee_id_d8eec2ea
- workforce_bonus_record_pkey

## Table: workforce_customers
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| athens_tenant_id | uuid | NO | - |
| name | character varying | NO | - |
| phone | character varying | NO | - |
| email | character varying | NO | - |
| address | text | NO | - |
| tax_id | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_c_athens__2f0fe7_idx
- workforce_customers_athens_tenant_id_75043f8d
- workforce_customers_pkey

## Table: workforce_department
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_department_athens_tenant_id_b9e614cc
- workforce_department_athens_tenant_id_name_f6f2b415_uniq
- workforce_department_pkey

## Table: workforce_designation
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_designation_athens_tenant_id_9751b677
- workforce_designation_athens_tenant_id_name_17eaef32_uniq
- workforce_designation_pkey

## Table: workforce_employee
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| employee_code | character varying | NO | - |
| full_name | character varying | NO | - |
| father_or_husband_name | character varying | NO | - |
| gender | character varying | NO | - |
| date_of_birth | date | NO | - |
| permanent_address | text | NO | - |
| contact_number | character varying | NO | - |
| employment_type | character varying | NO | - |
| skill_category | character varying | NO | - |
| joining_date | date | NO | - |
| confirmation_date | date | YES | - |
| leaving_date | date | YES | - |
| status | character varying | NO | - |
| uan_number | character varying | NO | - |
| esi_number | character varying | NO | - |
| pf_applicable | boolean | NO | - |
| esi_applicable | boolean | NO | - |
| lwf_applicable | boolean | NO | - |
| wage_type | character varying | NO | - |
| basic_structure | numeric | NO | - |
| da_structure | numeric | NO | - |
| hra_structure | numeric | NO | - |
| other_allowances_structure | numeric | NO | - |
| overtime_rate | numeric | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| department_id | bigint | YES | - |
| designation_id | bigint | YES | - |

**Indexes:**
- workforce_e_athens__fe24e9_idx
- workforce_employee_athens_tenant_id_9acf51ff
- workforce_employee_athens_tenant_id_employee_code_30ba920a_uniq
- workforce_employee_department_id_0218740c
- workforce_employee_designation_id_5f676b0c
- workforce_employee_pkey

## Table: workforce_employee_profile
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| employee_id | character varying | NO | - |
| department | character varying | NO | - |
| designation | character varying | NO | - |
| date_of_joining | date | YES | - |
| phone | character varying | NO | - |
| address | text | NO | - |
| emergency_contact | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- workforce_employee_profile_athens_tenant_id_02607d38
- workforce_employee_profile_employee_id_1d3d180c_like
- workforce_employee_profile_employee_id_key
- workforce_employee_profile_pkey
- workforce_employee_profile_user_id_key

## Table: workforce_fine
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| fine_date | date | NO | - |
| amount | numeric | NO | - |
| reason | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |

**Indexes:**
- workforce_fine_athens_tenant_id_4faf2da1
- workforce_fine_employee_id_97ac0e12
- workforce_fine_pkey

## Table: workforce_holiday
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| holiday_date | date | NO | - |
| holiday_type | character varying | NO | - |
| notification_reference | character varying | NO | - |
| description | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_holiday_athens_tenant_id_46acff12
- workforce_holiday_athens_tenant_id_holiday_date_6bb3e712_uniq
- workforce_holiday_pkey

## Table: workforce_invoices
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| athens_tenant_id | uuid | NO | - |
| invoice_no | character varying | NO | - |
| date | date | NO | - |
| due_date | date | YES | - |
| status | character varying | NO | - |
| subtotal | numeric | NO | - |
| tax | numeric | NO | - |
| total | numeric | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| customer_id | uuid | NO | - |
| project_id | uuid | YES | - |

**Indexes:**
- workforce_i_athens__b34fbb_idx
- workforce_invoices_athens_tenant_id_b71d0ee5
- workforce_invoices_athens_tenant_id_invoice_no_52c365da_uniq
- workforce_invoices_customer_id_ee33dc2f
- workforce_invoices_pkey
- workforce_invoices_project_id_41b730f9

## Table: workforce_leave_balance
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| total_days | integer | NO | - |
| used_days | integer | NO | - |
| year | integer | NO | - |
| employee_id | bigint | NO | - |
| leave_type_id | bigint | NO | - |

**Indexes:**
- workforce_leave_balance_athens_tenant_id_6d4c4557
- workforce_leave_balance_employee_id_0f29e09e
- workforce_leave_balance_employee_id_leave_type_i_9df0a0a2_uniq
- workforce_leave_balance_leave_type_id_a45d38dd
- workforce_leave_balance_pkey

## Table: workforce_leave_request
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| start_date | date | NO | - |
| end_date | date | NO | - |
| days_count | integer | NO | - |
| reason | text | NO | - |
| status | character varying | NO | - |
| approved_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | - |
| approved_by_id | bigint | YES | - |
| employee_id | bigint | NO | - |
| leave_type_id | bigint | NO | - |

**Indexes:**
- workforce_l_athens__bb21ec_idx
- workforce_leave_request_approved_by_id_319ace8a
- workforce_leave_request_athens_tenant_id_bf07a912
- workforce_leave_request_employee_id_f50e4dba
- workforce_leave_request_leave_type_id_9959fe76
- workforce_leave_request_pkey

## Table: workforce_leave_type
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| name | character varying | NO | - |
| days_allowed | integer | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_leave_type_athens_tenant_id_7c54ff8a
- workforce_leave_type_pkey

## Table: workforce_payments
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| paid_on | date | NO | - |
| amount | numeric | NO | - |
| mode | character varying | NO | - |
| reference_no | character varying | NO | - |
| notes | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| invoice_id | uuid | NO | - |

**Indexes:**
- workforce_payments_invoice_id_c3a2f654
- workforce_payments_pkey

## Table: workforce_payroll_cycle
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| cycle_name | character varying | NO | - |
| period_from | date | NO | - |
| period_to | date | NO | - |
| status | character varying | NO | - |
| processed_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_payroll_cycle_athens_tenant_id_b0d03931
- workforce_payroll_cycle_athens_tenant_id_cycle_n_edeb579a_uniq
- workforce_payroll_cycle_pkey

## Table: workforce_payroll_entry
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| total_days_worked | integer | NO | - |
| paid_leave_days | integer | NO | - |
| unpaid_leave_days | integer | NO | - |
| overtime_hours | numeric | NO | - |
| basic_earned | numeric | NO | - |
| da_earned | numeric | NO | - |
| hra_earned | numeric | NO | - |
| other_allowances | numeric | NO | - |
| overtime_wages | numeric | NO | - |
| gross_salary | numeric | NO | - |
| pf_employee | numeric | NO | - |
| esi_employee | numeric | NO | - |
| professional_tax | numeric | NO | - |
| fines | numeric | NO | - |
| advances | numeric | NO | - |
| other_deductions | numeric | NO | - |
| total_deductions | numeric | NO | - |
| net_salary | numeric | NO | - |
| payment_date | date | YES | - |
| payment_mode | character varying | NO | - |
| transaction_reference | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| employee_id | bigint | NO | - |
| payroll_cycle_id | bigint | NO | - |

**Indexes:**
- workforce_payroll_entry_athens_tenant_id_c2cddf59
- workforce_payroll_entry_employee_id_b173fce9
- workforce_payroll_entry_payroll_cycle_id_5f80e5e5
- workforce_payroll_entry_payroll_cycle_id_employe_4f8bf5ea_uniq
- workforce_payroll_entry_pkey

## Table: workforce_payroll_settings
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| pf_rate | numeric | NO | - |
| esi_rate | numeric | NO | - |
| bonus_min_percent | numeric | NO | - |
| bonus_max_percent | numeric | NO | - |
| ot_multiplier | numeric | NO | - |
| min_wage_category | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_payroll_settings_athens_tenant_id_key
- workforce_payroll_settings_pkey

## Table: workforce_project_members
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| role_on_project | character varying | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| user_id | bigint | NO | - |
| project_id | uuid | NO | - |

**Indexes:**
- workforce_project_members_pkey
- workforce_project_members_project_id_ccb35df5
- workforce_project_members_project_id_user_id_d380c505_uniq
- workforce_project_members_user_id_6a05ca5e

## Table: workforce_projects
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| athens_tenant_id | uuid | NO | - |
| code | character varying | NO | - |
| name | character varying | NO | - |
| client_name | character varying | NO | - |
| status | character varying | NO | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| budget | numeric | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| created_by_id | bigint | YES | - |

**Indexes:**
- workforce_p_athens__8ba3e7_idx
- workforce_projects_athens_tenant_id_cdf8b557
- workforce_projects_athens_tenant_id_code_76287aa5_uniq
- workforce_projects_created_by_id_18d5a0be
- workforce_projects_pkey

## Table: workforce_purchase_orders
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| athens_tenant_id | uuid | NO | - |
| po_no | character varying | NO | - |
| date | date | NO | - |
| status | character varying | NO | - |
| subtotal | numeric | NO | - |
| tax | numeric | NO | - |
| total | numeric | NO | - |
| notes | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| customer_id | uuid | NO | - |
| project_id | uuid | YES | - |

**Indexes:**
- workforce_purchase_orders_athens_tenant_id_98afb59e
- workforce_purchase_orders_athens_tenant_id_po_no_727f2ab9_uniq
- workforce_purchase_orders_customer_id_4c0a83b6
- workforce_purchase_orders_pkey
- workforce_purchase_orders_project_id_9cef7ee0

## Table: workforce_quotations
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| athens_tenant_id | uuid | NO | - |
| quote_no | character varying | NO | - |
| date | date | NO | - |
| status | character varying | NO | - |
| subtotal | numeric | NO | - |
| tax | numeric | NO | - |
| total | numeric | NO | - |
| notes | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| customer_id | uuid | NO | - |
| project_id | uuid | YES | - |

**Indexes:**
- workforce_quotations_athens_tenant_id_366981ab
- workforce_quotations_athens_tenant_id_quote_no_802bdea4_uniq
- workforce_quotations_customer_id_81266ed1
- workforce_quotations_pkey
- workforce_quotations_project_id_37984279

## Table: workforce_shift_schedule
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO | - |
| athens_tenant_id | integer | NO | - |
| shift_name | character varying | NO | - |
| start_time | time without time zone | NO | - |
| end_time | time without time zone | NO | - |
| weekly_off_day | integer | NO | - |
| max_hours_per_day | numeric | NO | - |
| created_at | timestamp with time zone | NO | - |

**Indexes:**
- workforce_shift_schedule_athens_tenant_id_0242c62a
- workforce_shift_schedule_athens_tenant_id_shift_n_17cf143f_uniq
- workforce_shift_schedule_pkey

## Table: workforce_task_comments
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| comment | text | NO | - |
| created_at | timestamp with time zone | NO | - |
| task_id | uuid | NO | - |
| user_id | bigint | NO | - |

**Indexes:**
- workforce_task_comments_pkey
- workforce_task_comments_task_id_27629ebf
- workforce_task_comments_user_id_d4333306

## Table: workforce_task_dependencies
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| depends_on_task_id | uuid | NO | - |
| task_id | uuid | NO | - |

**Indexes:**
- workforce_task_dependenc_task_id_depends_on_task__d7534a71_uniq
- workforce_task_dependencies_depends_on_task_id_c1614b4b
- workforce_task_dependencies_pkey
- workforce_task_dependencies_task_id_518d391a

## Table: workforce_tasks
================================================================================

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| title | character varying | NO | - |
| description | text | NO | - |
| status | character varying | NO | - |
| priority | character varying | NO | - |
| start_date | date | YES | - |
| due_date | date | YES | - |
| kanban_column | character varying | NO | - |
| order_index | integer | NO | - |
| sla_due_at | timestamp with time zone | YES | - |
| sla_status | character varying | NO | - |
| completed_at | timestamp with time zone | YES | - |
| deleted_at | timestamp with time zone | YES | - |
| created_at | timestamp with time zone | NO | - |
| updated_at | timestamp with time zone | NO | - |
| assigned_to_id | bigint | YES | - |
| created_by_id | bigint | YES | - |
| project_id | uuid | NO | - |

**Indexes:**
- workforce_t_assigne_9868e3_idx
- workforce_t_project_f9a02b_idx
- workforce_t_sla_sta_88e978_idx
- workforce_tasks_assigned_to_id_2c193c3c
- workforce_tasks_created_by_id_33e1fe90
- workforce_tasks_pkey
- workforce_tasks_project_id_d5a137c9

