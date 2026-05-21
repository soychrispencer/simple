CREATE TABLE IF NOT EXISTS "serenata_song_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) NOT NULL,
  "title_normalized" varchar(220) NOT NULL,
  "artist" varchar(160),
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_preset" boolean DEFAULT false NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "serenata_song_catalog_title_norm_idx"
  ON "serenata_song_catalog" ("title_normalized");

CREATE INDEX IF NOT EXISTS "serenata_song_catalog_preset_idx"
  ON "serenata_song_catalog" ("is_preset");

ALTER TABLE "serenata_repertoire_songs"
  ADD COLUMN IF NOT EXISTS "catalog_song_id" uuid REFERENCES "serenata_song_catalog"("id") ON DELETE restrict;

CREATE UNIQUE INDEX IF NOT EXISTS "serenata_repertoire_provider_catalog_idx"
  ON "serenata_repertoire_songs" ("provider_group_id", "catalog_song_id")
  WHERE "catalog_song_id" IS NOT NULL;

INSERT INTO "serenata_song_catalog" ("title", "title_normalized", "artist", "tags", "is_preset")
VALUES
  ('Las Mañanitas', 'las mananitas', 'Tradicional', '["Cumpleaños","Tradicional"]'::jsonb, true),
  ('Cielito Lindo', 'cielito lindo', 'Tradicional', '["Tradicional","Ranchera"]'::jsonb, true),
  ('Guadalajara', 'guadalajara', 'Tradicional', '["Tradicional","Ranchera"]'::jsonb, true),
  ('México Lindo y Querido', 'mexico lindo y querido', 'Jorge Negrete', '["Tradicional","Patriótica"]'::jsonb, true),
  ('Bésame Mucho', 'besame mucho', 'Consuelo Velázquez', '["Romántica","Bolero"]'::jsonb, true),
  ('Solamente Una Vez', 'solamente una vez', 'Agustín Lara', '["Romántica","Bolero"]'::jsonb, true),
  ('La Bikina', 'la bikina', 'Consuelo Velázquez', '["Tradicional","Ranchera"]'::jsonb, true),
  ('El Rey', 'el rey', 'José Alfredo Jiménez', '["Ranchera","Tradicional"]'::jsonb, true),
  ('Caminos de Michoacán', 'caminos de michoacan', 'Antonio Tanguma', '["Ranchera","Tradicional"]'::jsonb, true),
  ('Las Golondrinas', 'las golondrinas', 'Tradicional', '["Tradicional","Romántica"]'::jsonb, true),
  ('Serenata Huasteca', 'serenata huasteca', 'Tradicional', '["Tradicional","Huapango"]'::jsonb, true),
  ('Jesúsita en Chihuahua', 'jesusita en chihuahua', 'Quirino Mendoza', '["Tradicional","Ranchera"]'::jsonb, true),
  ('¡Ay, Jalisco, no te rajes!', 'ay, jalisco, no te rajes!', 'Pepe Guízar', '["Tradicional","Ranchera"]'::jsonb, true),
  ('Cucurrucucú Paloma', 'cucurrucucu paloma', 'Tomás Méndez', '["Tradicional","Ranchera"]'::jsonb, true),
  ('Granada', 'granada', 'Agustín Lara', '["Romántica","Bolero"]'::jsonb, true),
  ('Contigo en la Distancia', 'contigo en la distancia', 'César Portillo de la Luz', '["Romántica","Bolero"]'::jsonb, true),
  ('La Malagueña', 'la malaguena', 'Elpidio Ramírez', '["Tradicional","Ranchera"]'::jsonb, true),
  ('Volver, Volver', 'volver, volver', 'Fernando Z. Maldonado', '["Ranchera","Romántica"]'::jsonb, true),
  ('Amor Eterno', 'amor eterno', 'Juan Gabriel', '["Romántica","Día de la madre"]'::jsonb, true),
  ('La Llorona', 'la llorona', 'Tradicional', '["Tradicional"]'::jsonb, true),
  ('De Colores', 'de colores', 'Tradicional', '["Tradicional","Cumpleaños"]'::jsonb, true),
  ('Las Mañanitas (versión corta)', 'las mananitas (version corta)', 'Tradicional', '["Cumpleaños"]'::jsonb, true),
  ('Miénteme', 'mienteme', 'Rigo Tovar', '["Romántica"]'::jsonb, true),
  ('Hermoso Cariño', 'hermoso carino', 'Vicente Fernández', '["Romántica","Ranchera"]'::jsonb, true),
  ('Por Tu Maldito Amor', 'por tu maldito amor', 'Vicente Fernández', '["Ranchera","Romántica"]'::jsonb, true),
  ('El Son de la Negra', 'el son de la negra', 'Tradicional', '["Tradicional","Huapango"]'::jsonb, true),
  ('Jarabe Tapatío', 'jarabe tapatio', 'Tradicional', '["Tradicional","Patriótica"]'::jsonb, true),
  ('La Marcha de Zacatecas', 'la marcha de zacatecas', 'Tradicional', '["Tradicional","Patriótica"]'::jsonb, true),
  ('Las Mañanitas (instrumental)', 'las mananitas (instrumental)', 'Tradicional', '["Cumpleaños","Tradicional"]'::jsonb, true),
  ('Te Quiero', 'te quiero', 'Tradicional', '["Romántica","Sorpresa"]'::jsonb, true)
ON CONFLICT ("title_normalized") DO NOTHING;

