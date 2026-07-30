USE [Group3Database];
GO
ALTER TABLE [dbo].[MenuItem] ADD IsSpecial BIT DEFAULT 0;
GO
UPDATE [dbo].[MenuItem] SET IsSpecial = 0;
GO