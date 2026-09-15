CREATE TABLE IF NOT EXISTS rubros (
  Id INT NOT NULL AUTO_INCREMENT,
  IdRubro VARCHAR(6) NOT NULL,
  NombreRubro VARCHAR(45) NOT NULL,
  Descripcion VARCHAR(255) NULL,
  ImagenPrincipal VARCHAR(255) NULL,
  IdPadre INT NULL,
  Orden INT NOT NULL DEFAULT 0,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  FechaModificacion DATETIME NULL,
  PRIMARY KEY (Id),
  UNIQUE KEY uq_rubros_IdRubro (IdRubro),
  KEY fk_rubros_padre (IdPadre),
  CONSTRAINT fk_rubros_padre FOREIGN KEY (IdPadre) REFERENCES rubros (Id) ON DELETE RESTRICT
);
