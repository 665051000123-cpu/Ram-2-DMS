-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: dms_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `systemsetting`
--

DROP TABLE IF EXISTS `systemsetting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `systemsetting` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SystemSetting_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `systemsetting`
--

LOCK TABLES `systemsetting` WRITE;
/*!40000 ALTER TABLE `systemsetting` DISABLE KEYS */;
INSERT INTO `systemsetting` VALUES ('0725245c-1437-4653-80e4-49f736afce78','SCANNER_DIR','D:\\scanned-docs\\processed','2026-08-11 09:35:28.160'),('4c6682bf-d0f6-4d83-b89f-5ec49d41a502','SCANNER_APP_PATH','\"C:\\Program Files\\Pantum\\bm5100\\PushScan\\bm5100app.exe\" \"Pantum BM5100FDW Series\"','2026-08-11 09:35:28.168'),('5055ea8c-162d-441b-b47a-8450bfff307f','UPLOAD_DIR','D:\\DMS_Uploads ','2026-08-11 09:35:28.132'),('6cae9097-b4b7-479c-b000-6628d38be545','ROLE_PERMISSIONS','{\"DEPT_HEAD\":{\"menu_trash\":true,\"menu_audit\":true,\"menu_users\":true,\"doc_edit\":true,\"doc_delete\":true,\"menu_folders\":true},\"STAFF\":{\"menu_trash\":false,\"menu_audit\":false,\"menu_users\":false,\"doc_edit\":false,\"doc_delete\":false}}','2026-08-13 01:59:02.643');
/*!40000 ALTER TABLE `systemsetting` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-13  9:15:24
