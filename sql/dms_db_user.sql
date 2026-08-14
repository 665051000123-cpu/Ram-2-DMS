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
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','DEPT_HEAD','STAFF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STAFF',
  `departmentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `forcePasswordChange` tinyint(1) NOT NULL DEFAULT '1',
  `notifyOnShare` tinyint(1) NOT NULL DEFAULT '1',
  `notifyOnUpload` tinyint(1) NOT NULL DEFAULT '1',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  KEY `User_departmentId_fkey` (`departmentId`),
  CONSTRAINT `User_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('37b354c9-8277-4839-b9b9-4a9c001ea246','690005','$2b$10$1AMOAvze7.BLSyU.jE4Kf.RQ5JptbasF/3QkkJRjsDkZTF/fhsKna','test','STAFF','7a82ad79-9080-4d83-8a51-1313b27f99cc','2026-08-07 06:47:49.431','2026-08-07 09:16:30.696',1,1,1,1),('475d5a22-a26b-458e-84e2-68d6aade4776','000000','$2b$10$odfpjz/qGvehPR0F905X0eExrw2R2LCsJog3IHqolqMTaH2JPAgzy','ผู้ดูแลระบบ','SUPER_ADMIN','612b8b69-5d7b-4dfa-8c9b-3e5fb4ae63e3','2026-08-06 02:51:55.867','2026-08-06 02:51:55.867',0,1,1,1),('8ba3b91a-d5cd-440a-878f-23e978ee4403','690003','$2b$10$QhTRUo6FMLtCPsyeX0twAOGJvf2kB6SyymglvLqgNGjbxjrnVbueC','พันธมิตร อย่าห้าม','DEPT_HEAD','35e220b4-c2fc-45bc-87ca-e8ce76566dc0','2026-08-06 05:01:12.318','2026-08-07 07:27:07.154',0,1,1,1),('abdc1806-ed36-4e39-a70d-e70abfafae91','690001','$2b$10$46djeOjYdyOt.op9gN.gIu/NPT7Dk3qR12baaRmx1FITIIYQSvv.i','พิรัชชัย คนทน','STAFF','8c5ca497-9b19-4e01-974f-0eba36383581','2026-08-06 03:55:22.687','2026-08-06 04:48:53.470',0,1,1,1),('fdb1f6ce-7300-4d85-a0f2-17564c42744b','690002','$2b$10$TxE2OIxppn2l8nSlbjP50uLD/aIou2iwBqxCNKSgHt9ORiu0k4ddW','ศุภณัฏฐ์ นิ่มอนงค์','STAFF','35e220b4-c2fc-45bc-87ca-e8ce76566dc0','2026-08-06 04:48:47.472','2026-08-06 06:35:09.779',0,1,1,1);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
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
