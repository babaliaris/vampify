CREATE TABLE `t_react_logs` (
	`m_id` bigint AUTO_INCREMENT NOT NULL,
	`m_user_id` bigint NOT NULL,
	`m_ip` varchar(45) NOT NULL,
	`m_level` varchar(10) NOT NULL,
	`m_message` varchar(500) NOT NULL,
	`m_payload` json,
	`m_url` text,
	`m_user_agent` text,
	`m_browser` varchar(50),
	`m_os` varchar(50),
	`m_timestamp` datetime(3) NOT NULL,
	`m_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `t_react_logs_m_id` PRIMARY KEY(`m_id`)
);
--> statement-breakpoint
CREATE TABLE `t_vampify_logs` (
	`m_id` bigint AUTO_INCREMENT NOT NULL,
	`m_req_id` varchar(50),
	`m_user_id` bigint,
	`m_ip` varchar(45) NOT NULL,
	`m_level` enum('trace','debug','warn','error','fatal','info') NOT NULL,
	`m_message` varchar(500) NOT NULL,
	`m_payload` json,
	`m_url` text,
	`m_method` varchar(10),
	`m_status` int,
	`m_timestamp` datetime(3) NOT NULL,
	`m_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `t_vampify_logs_m_id` PRIMARY KEY(`m_id`)
);
--> statement-breakpoint
CREATE TABLE `t_users` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`m_email` varchar(255) NOT NULL,
	`m_password` varchar(255) NOT NULL,
	`m_role` varchar(255) NOT NULL DEFAULT 'GUEST',
	`m_verification_hash` varchar(255) NOT NULL,
	`m_is_verified` boolean NOT NULL,
	CONSTRAINT `t_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `t_users_m_email_unique` UNIQUE(`m_email`)
);
