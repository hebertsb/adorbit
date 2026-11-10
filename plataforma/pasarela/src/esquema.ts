export const typeDefs = `#graphql
  enum EstadoCampana {
    borrador
    pendiente_aprobacion
    pendiente
    activa
    pausada
    finalizada
    cancelada
    rechazada
  }

  enum Moneda {
    BOB
    USD
  }

  enum MedioPublicitario {
    television
    radio
    prensa
    digital
    valla_exterior
    tv
    vallas
    redes
  }

  type Presupuesto {
    id: ID!
    montoTotal: Float!
    montoGastado: Float!
    moneda: Moneda!
    anticipoPorcentaje: Float!
  }

  type CalendarioMedio {
    id: ID!
    medio: MedioPublicitario!
    fechaInicio: String!
    fechaFin: String!
    costoEstimado: Float!
    estado: String!
  }

  type Cliente {
    id: ID!
    razonSocial: String!
    nit: String
    estado: String!
    lineaCredito: Float
  }

  type PiezaCreativa {
    id: ID!
    titulo: String!
    tipoMedio: String!
    estado: String!
    urlArchivo: String
    version: Int!
  }

  type Factura {
    id: ID!
    total: Float!
    moneda: Moneda!
    estado: String!
    fechaEmision: String!
    fechaVencimiento: String
  }

  type SagaTransaccion {
    sagaId: ID!
    campanaId: ID!
    estado: String!
    pasoActual: String!
    motivoFallo: String
    creadoEn: String!
  }

  type Campana {
    id: ID!
    clienteId: ID!
    nombre: String!
    descripcion: String
    estado: EstadoCampana!
    fechaInicio: String!
    fechaFin: String!
    version: Int!
    creadoEn: String!
    actualizadoEn: String!
    presupuesto: Presupuesto
    calendario: [CalendarioMedio!]!
    cliente: Cliente
    piezas: [PiezaCreativa!]!
    facturas: [Factura!]!
  }

  type Query {
    campanas(estado: EstadoCampana, limite: Int, pagina: Int): [Campana!]!
    campana(id: ID!): Campana
    cliente(id: ID!): Cliente
    saga(id: ID!): SagaTransaccion
  }

  input CrearCampanaInput {
    clienteId: ID!
    nombre: String!
    descripcion: String
    fechaInicio: String!
    fechaFin: String!
  }

  type ContratarCampanaRespuesta {
    sagaId: ID!
    estado: String!
    mensaje: String!
  }

  type Mutation {
    crearCampana(input: CrearCampanaInput!): Campana!
    contratarCampana(id: ID!): ContratarCampanaRespuesta!
  }
`;

/** ms-creatividades valida UUID RFC 4122; algunas campañas semilla antiguas
 * usan IDs legibles con formato parecido, pero sin versión/variante UUID. */
export const esUuidRfc4122 = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

const URL_CAMPANAS = process.env.URL_MS_CAMPANAS || "http://localhost:8081";
const URL_CRM = process.env.URL_MS_CLIENTES_CRM || "http://localhost:8082";
const URL_FACTURACION = process.env.URL_MS_FACTURACION || "http://localhost:8083";
const URL_CREATIVIDADES = process.env.URL_MS_CREATIVIDADES || "http://localhost:8084";

const CLIENTES_RESPALDO: Record<string, { razonSocial: string; nit: string; estado: string; lineaCredito: number }> = {
  "00000000-0000-0000-0000-000000000001": { razonSocial: "Banco Mercantil Santa Cruz S.A.", nit: "1020304028", estado: "activo", lineaCredito: 500000 },
  "00000000-0000-0000-0000-000000000002": { razonSocial: "Cervecería Boliviana Nacional S.A.", nit: "1020456021", estado: "activo", lineaCredito: 1200000 },
  "00000000-0000-0000-0000-000000000003": { razonSocial: "Avícola Sofía Ltda.", nit: "1015682024", estado: "activo", lineaCredito: 400000 },
  "00000000-0000-0000-0000-000000000004": { razonSocial: "Farmacias Chávez S.A.", nit: "1028741029", estado: "activo", lineaCredito: 300000 },
  "00000000-0000-0000-0000-000000000005": { razonSocial: "Telecel S.A. (Tigo Bolivia)", nit: "1020112025", estado: "activo", lineaCredito: 900000 },
  "00000000-0000-0000-0000-000000000006": { razonSocial: "Embotelladoras Bolivianas Unidas S.A. (EMBOL)", nit: "1020224023", estado: "activo", lineaCredito: 800000 },
  "00000000-0000-0000-0000-000000000007": { razonSocial: "Hipermaxi S.A.", nit: "1017325026", estado: "activo", lineaCredito: 500000 },
  "00000000-0000-0000-0000-000000000008": { razonSocial: "Boliviana de Aviación (BoA)", nit: "154362025", estado: "activo", lineaCredito: 600000 },
  "00000000-0000-0000-0000-000000000009": { razonSocial: "Droguería INTI S.A.", nit: "1020339027", estado: "activo", lineaCredito: 350000 },
  "00000000-0000-0000-0000-000000000010": { razonSocial: "Imcruz Comercial S.A. (Suzuki)", nit: "1020548022", estado: "moroso", lineaCredito: 450000 },
  "00000000-0000-0000-0000-000000000011": { razonSocial: "Entel S.A.", nit: "1020703023", estado: "activo", lineaCredito: 1000000 },
  "00000000-0000-0000-0000-000000000012": { razonSocial: "Banco Nacional de Bolivia S.A. (BNB)", nit: "1020215024", estado: "activo", lineaCredito: 750000 },
  "00000000-0000-0000-0000-000000000013": { razonSocial: "PIL Andina S.A.", nit: "1020755027", estado: "activo", lineaCredito: 650000 },
  "00000000-0000-0000-0000-000000000014": { razonSocial: "Banco Bisa S.A.", nit: "1020149021", estado: "activo", lineaCredito: 600000 },
  "00000000-0000-0000-0000-000000000015": { razonSocial: "YPFB Refinación S.A.", nit: "1028355025", estado: "activo", lineaCredito: 950000 },
  "00000000-0000-0000-0000-000000000016": { razonSocial: "Nuevatel PCS de Bolivia S.A. (Viva)", nit: "1020612028", estado: "moroso", lineaCredito: 400000 },
  "00000000-0000-0000-0000-000000000017": { razonSocial: "Toyosa S.A.", nit: "1020411022", estado: "moroso", lineaCredito: 550000 },
  "00000000-0000-0000-0000-000000000018": { razonSocial: "Industrias de Aceite S.A. (FINO)", nit: "1020388029", estado: "activo", lineaCredito: 500000 },
  "00000000-0000-0000-0000-000000000019": { razonSocial: "Laboratorios Bagó de Bolivia S.A.", nit: "1020599021", estado: "activo", lineaCredito: 380000 },
  "00000000-0000-0000-0000-000000000020": { razonSocial: "Cine Center Bolivia S.A.", nit: "1028914026", estado: "moroso", lineaCredito: 250000 },
};

let crmCaidoHasta = 0;

async function peticionSegura<T>(url: string, opciones: RequestInit = {}, timeoutMs = 2000): Promise<T | null> {
  const esCrm = url.startsWith(URL_CRM);
  if (esCrm && Date.now() < crmCaidoHasta) {
    return null;
  }
  try {
    const respuesta = await fetch(url, {
      ...opciones,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!respuesta.ok) {
      if (esCrm && respuesta.status >= 500) {
        crmCaidoHasta = Date.now() + 15000;
      }
      return null;
    }
    return (await respuesta.json()) as T;
  } catch {
    if (esCrm) {
      crmCaidoHasta = Date.now() + 15000;
    }
    return null;
  }
}

export const resolvers = {
  Query: {
    campanas: async (_: unknown, args: { estado?: string; limite?: number; pagina?: number }, contexto: any) => {
      const page = args.pagina || 0;
      const size = args.limite || 20;
      const url = `${URL_CAMPANAS}/api/v1/campanas?page=${page}&size=${size}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;
      
      // ms-campanas devuelve Page<T> de Spring Data, cuyo campo real es "content" (no
      // "contenido") -- con el nombre en espanol este resolver siempre devolvia [],
      // sin importar cuantas campanas reales existieran (encontrado probando en vivo:
      // la mutacion crearCampana si funcionaba, pero la lista nunca mostraba nada nuevo).
      const respuesta = await peticionSegura<{ content: any[] }>(url, { headers });
      if (!respuesta || !respuesta.content) return [];

      return respuesta.content.map((c) => ({
        id: c.id,
        clienteId: c.cliente_id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        estado: c.estado,
        fechaInicio: c.fecha_inicio,
        fechaFin: c.fecha_fin,
        version: c.version,
        creadoEn: c.creado_en,
        actualizadoEn: c.actualizado_en
      }));
    },

    campana: async (_: unknown, args: { id: string }, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/campanas/${args.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const c = await peticionSegura<any>(url, { headers });
      if (!c) return null;

      return {
        id: c.id,
        clienteId: c.cliente_id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        estado: c.estado,
        fechaInicio: c.fecha_inicio,
        fechaFin: c.fecha_fin,
        version: c.version,
        creadoEn: c.creado_en,
        actualizadoEn: c.actualizado_en
      };
    },

    cliente: async (_: unknown, args: { id: string }, contexto: any) => {
      const url = `${URL_CRM}/api/v1/clientes/${args.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const cl = await peticionSegura<any>(url, { headers });
      if (!cl) {
        const respaldo = CLIENTES_RESPALDO[args.id];
        return {
          id: args.id,
          razonSocial: respaldo?.razonSocial || "Cliente " + args.id.substring(0, 8),
          nit: respaldo?.nit || "000000000",
          estado: respaldo?.estado || "activo",
          lineaCredito: respaldo?.lineaCredito ?? 50000.0
        };
      }
      return {
        id: cl.id,
        razonSocial: cl.razon_social,
        nit: cl.nit,
        estado: cl.estado,
        lineaCredito: cl.linea_credito
      };
    },

    saga: async (_: unknown, args: { id: string }, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/sagas/${args.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const s = await peticionSegura<any>(url, { headers });
      if (!s) return null;

      return {
        sagaId: s.id,
        campanaId: s.campana_id,
        estado: s.estado,
        pasoActual: s.paso_actual,
        motivoFallo: s.motivo_fallo,
        creadoEn: s.creado_en
      };
    }
  },

  Campana: {
    presupuesto: async (padre: any, _: unknown, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/campanas/${padre.id}/presupuesto`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const p = await peticionSegura<any>(url, { headers });
      if (!p) return null;

      return {
        id: p.id,
        montoTotal: p.monto_total,
        montoGastado: p.monto_gastado,
        moneda: p.moneda,
        anticipoPorcentaje: p.anticipo_porcentaje
      };
    },

    calendario: async (padre: any, _: unknown, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/campanas/${padre.id}/calendario`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const items = await peticionSegura<any[]>(url, { headers });
      if (!items || !Array.isArray(items)) return [];

      return items.map((m) => ({
        id: m.id,
        medio: m.medio,
        fechaInicio: m.fecha_inicio,
        fechaFin: m.fecha_fin,
        costoEstimado: m.costo_estimado ?? m.costo ?? 0,
        estado: m.estado
      }));
    },

    cliente: async (padre: any, _: unknown, contexto: any) => {
      if (!padre.clienteId) return null;
      const url = `${URL_CRM}/api/v1/clientes/${padre.clienteId}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const cl = await peticionSegura<any>(url, { headers });
      if (!cl) {
        const respaldo = CLIENTES_RESPALDO[padre.clienteId];
        return {
          id: padre.clienteId,
          razonSocial: respaldo?.razonSocial || "Cliente " + padre.clienteId.substring(0, 8),
          nit: respaldo?.nit || "1020304050",
          estado: respaldo?.estado || "activo",
          lineaCredito: respaldo?.lineaCredito ?? 100000.0
        };
      }
      return {
        id: cl.id,
        razonSocial: cl.razon_social,
        nit: cl.nit,
        estado: cl.estado,
        lineaCredito: cl.linea_credito
      };
    },

    piezas: async (padre: any, _: unknown, contexto: any) => {
      if (!esUuidRfc4122(padre.id)) return [];
      const url = `${URL_CREATIVIDADES}/api/v1/briefs?campana_id=${padre.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      try {
        const obtener = async (direccion: string) => {
          const respuesta = await fetch(direccion, { headers, signal: AbortSignal.timeout(4000) });
          if (!respuesta.ok) throw new Error(`Error al consultar creatividades: ${respuesta.status}`);
          return respuesta.json();
        };
        const briefs: any[] = [];
        let pagina = 1;
        let total = 0;
        do {
          const resultado = await obtener(`${url}&page=${pagina}&size=100`);
          if (!Array.isArray(resultado.items) || typeof resultado.total !== 'number') {
            return [];
          }
          briefs.push(...resultado.items);
          total = resultado.total;
          if (!resultado.items.length && briefs.length < total) break;
          pagina++;
        } while (briefs.length < total);
        const grupos = await Promise.all(briefs.map(async (brief) => {
          const resultado = await obtener(`${URL_CREATIVIDADES}/api/v1/briefs/${encodeURIComponent(brief.id)}/piezas`);
          if (!Array.isArray(resultado.items)) return [];
          return resultado.items.map((p: any) => ({
            id: p.id, titulo: p.nombre, tipoMedio: p.tipo, estado: p.estado,
            urlArchivo: p.archivo?.ruta, version: p.versionNumero
          }));
        }));
        return grupos.flat();
      } catch {
        return [];
      }
    },

    facturas: async (padre: any, _: unknown, contexto: any) => {
      const url = `${URL_FACTURACION}/api/v1/facturas?campana=${padre.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const facturas = await peticionSegura<any[]>(url, { headers });
      if (!facturas || !Array.isArray(facturas)) return [];
      return facturas.map((f) => ({
        id: f.id,
        total: f.total,
        moneda: f.moneda,
        estado: f.estado,
        fechaEmision: f.fecha_emision,
        fechaVencimiento: f.fecha_vencimiento
      }));
    }
  },

  Mutation: {
    crearCampana: async (_: unknown, args: { input: any }, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/campanas`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": "gql-" + Date.now() + "-" + Math.random().toString(36).substring(7)
      };
      if (contexto.token) headers["Authorization"] = contexto.token;

      const cuerpo = {
        cliente_id: args.input.clienteId,
        nombre: args.input.nombre,
        descripcion: args.input.descripcion,
        fecha_inicio: args.input.fechaInicio,
        fecha_fin: args.input.fechaFin
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(cuerpo)
      });

      if (!res.ok) {
        throw new Error("Error al crear campana: " + res.statusText);
      }

      const c = await res.json();
      return {
        id: c.id,
        clienteId: c.cliente_id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        estado: c.estado,
        fechaInicio: c.fecha_inicio,
        fechaFin: c.fecha_fin,
        version: c.version,
        creadoEn: c.creado_en,
        actualizadoEn: c.actualizado_en
      };
    },

    contratarCampana: async (_: unknown, args: { id: string }, contexto: any) => {
      const url = `${URL_CAMPANAS}/api/v1/campanas/${args.id}/contratar`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": "gql-contratar-" + args.id + "-" + Date.now()
      };
      if (contexto.token) headers["Authorization"] = contexto.token;

      const res = await fetch(url, {
        method: "POST",
        headers
      });

      if (!res.ok && res.status !== 202) {
        throw new Error("Error al iniciar contratacion de campana: " + res.statusText);
      }

      const datos = await res.json();
      return {
        sagaId: datos.id,
        estado: datos.estado,
        mensaje: "Contratación iniciada"
      };
    }
  }
};

