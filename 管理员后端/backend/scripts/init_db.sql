-- ---------------------------------------------------------------------------
-- 数据库初始化（MySQL 8.0 / InnoDB / utf8mb4）
-- 用法：mysql -uroot -p < scripts/init_db.sql
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `football_admin`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 应用账号（密码请在生产环境替换）
CREATE USER IF NOT EXISTS 'fa_admin'@'localhost' IDENTIFIED BY 'fa_2026_pwd';
GRANT ALL PRIVILEGES ON `football_admin`.* TO 'fa_admin'@'localhost';
FLUSH PRIVILEGES;
