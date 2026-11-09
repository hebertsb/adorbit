add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header X-Frame-Options DENY always;
# El panel BI se monta dentro de este mismo documento y usa el microfono para
# dictado. Se limita al propio origen; camara y geolocalizacion siguen denegadas.
add_header Permissions-Policy "camera=(), microphone=(self), geolocation=()" always;
