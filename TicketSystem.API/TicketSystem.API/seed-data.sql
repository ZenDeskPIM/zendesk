-- Garantir somente os departamentos oficiais
IF NOT EXISTS (SELECT 1
FROM Departments
WHERE Name = N'Financeiro')
BEGIN
    INSERT INTO Departments
        (Name, Description, Color, IsActive, CreatedAt, IsDeleted)
    VALUES
        (N'Financeiro', N'Pagamentos, faturamento e orçamento', N'#4ECDC4', 1, GETUTCDATE(), 0);
END

IF NOT EXISTS (SELECT 1
FROM Departments
WHERE Name = N'RH')
BEGIN
    INSERT INTO Departments
        (Name, Description, Color, IsActive, CreatedAt, IsDeleted)
    VALUES
        (N'RH', N'Admissão, folha, benefícios e suporte ao colaborador', N'#55EFC4', 1, GETUTCDATE(), 0);
END

IF NOT EXISTS (SELECT 1
FROM Departments
WHERE Name = N'Produção')
BEGIN
    INSERT INTO Departments
        (Name, Description, Color, IsActive, CreatedAt, IsDeleted)
    VALUES
        (N'Produção', N'PCP, chão de fábrica, logística interna', N'#00CEC9', 1, GETUTCDATE(), 0);
END

IF NOT EXISTS (SELECT 1
FROM Departments
WHERE Name = N'T.I')
BEGIN
    INSERT INTO Departments
        (Name, Description, Color, IsActive, CreatedAt, IsDeleted)
    VALUES
        (N'T.I', N'Suporte técnico, sistemas e infraestrutura', N'#6C5CE7', 1, GETUTCDATE(), 0);
END

DECLARE @allowed TABLE (Name NVARCHAR(100));
INSERT INTO @allowed
    (Name)
VALUES
    (N'Financeiro'),
    (N'RH'),
    (N'Produção'),
    (N'T.I');

DECLARE @fallbackDepartmentId INT = (
    SELECT TOP 1
    Id
FROM Departments
WHERE Name = N'T.I'
);

IF @fallbackDepartmentId IS NULL
BEGIN
    SELECT @fallbackDepartmentId = Id
    FROM Departments
    WHERE Name = N'Financeiro';
END

IF @fallbackDepartmentId IS NOT NULL
BEGIN
    UPDATE Tickets
    SET DepartmentId = @fallbackDepartmentId
    WHERE DepartmentId IN (
        SELECT d.Id
    FROM Departments d
        LEFT JOIN @allowed a ON d.Name = a.Name
    WHERE a.Name IS NULL
    );
END

DELETE FROM Departments
WHERE Name NOT IN (SELECT Name
FROM @allowed);

-- Índice único para prevenir duplicatas de nome (garantir após limpeza)
IF NOT EXISTS (
    SELECT 1
FROM sys.indexes
WHERE name = 'UX_Departments_Name' AND object_id = OBJECT_ID('dbo.Departments')
)
BEGIN
    CREATE UNIQUE INDEX UX_Departments_Name ON dbo.Departments(Name);
END

-- Inserir Admin (senha: admin123) - idempotente (checa por email)
-- Removido do seed SQL para evitar divergência de senha.
-- O usuário admin (admin@ticketsystem.com / admin123) agora é criado
-- pelo DatabaseSeeder na inicialização da aplicação (Program.cs),
-- garantindo o mesmo hash gerado por código.