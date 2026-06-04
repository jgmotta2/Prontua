-- AlterTable
ALTER TABLE "users" ADD COLUMN "isAdministradorPlataforma" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inscricoes_lista_espera" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "ipHash" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscricoes_lista_espera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_lista_espera_email_key" ON "inscricoes_lista_espera"("email");

-- CreateIndex
CREATE INDEX "inscricoes_lista_espera_criadoEm_idx" ON "inscricoes_lista_espera"("criadoEm");
