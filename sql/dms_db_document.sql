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
-- Table structure for table `document`
--

DROP TABLE IF EXISTS `document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fileUrl` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileType` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `currentVersion` int NOT NULL DEFAULT '1',
  `documentType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `fileSize` int NOT NULL DEFAULT '0',
  `extractedText` longtext COLLATE utf8mb4_unicode_ci,
  `storagePath` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isExpired` tinyint(1) NOT NULL DEFAULT '0',
  `retentionPeriod` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Document_documentCode_key` (`documentCode`),
  KEY `Document_departmentId_fkey` (`departmentId`),
  KEY `Document_uploaderId_fkey` (`uploaderId`),
  KEY `Document_folderId_fkey` (`folderId`),
  CONSTRAINT `Document_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Document_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `folder` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Document_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document`
--

LOCK TABLES `document` WRITE;
/*!40000 ALTER TABLE `document` DISABLE KEYS */;
/*!40000 ALTER TABLE `document` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-13  9:15:23
