USE [Group3Database];
GO
ALTER TABLE [dbo].[MenuItem] ADD IsAvailable BIT DEFAULT 1;
GO
UPDATE [dbo].[MenuItem] SET IsAvailable = 1;
GO