# Cabeceras de seguridad. nginx NO hereda los add_header del server en un location que define los suyos: # por
eso este archivo se incluye explicitamente en cada location. El microfono se permite: es para dictar.
add_header X-Content-Type-Options nosniff always; add_header Referrer-Policy strict-origin-when-cross-origin
always; add_header Permissions-Policy "camera=(), geolocation=()" always;
