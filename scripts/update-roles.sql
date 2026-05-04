-- Actualizar roles de los usuarios de prueba
UPDATE users SET role = 'client' WHERE email = 'cliente@simpleserenatas.app';
UPDATE users SET role = 'musician' WHERE email = 'musico@simpleserenatas.app';
UPDATE users SET role = 'musician' WHERE email = 'coordinador@simpleserenatas.app';
