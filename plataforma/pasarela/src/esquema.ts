export const typeDefs = `#graphql
  enum EstadoCampana {
    borrador
    pendiente
    activa
    pausada
    completada
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

const URL_CAMPANAS = process.env.URL_MS_CAMPANAS || "http://localhost:8081";
const URL_CRM = process.env.URL_MS_CLIENTES_CRM || "http://localhost:8082";
const URL_FACTURACION = process.env.URL_MS_FACTURACION || "http://localhost:8083";
const URL_CREATIVIDADES = process.env.URL_MS_CREATIVIDADES || "http://localhost:8084";

async function peticionSegura<T>(url: string, opciones: RequestInit = {}): Promise<T | null> {
  try {
    const respuesta = await fetch(url, opciones);
    if (!respuesta.ok) {
      return null;
    }
    return (await respuesta.json()) as T;
  } catch {
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
      
      const respuesta = await peticionSegura<{ contenido: any[] }>(url, { headers });
      if (!respuesta || !respuesta.contenido) return [];

      return respuesta.contenido.map((c) => ({
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
        return {
          id: args.id,
          razonSocial: "Cliente " + args.id.substring(0, 8),
          nit: "000000000",
          estado: "activo",
          lineaCredito: 50000.0
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
        sagaId: s.saga_id,
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
        costoEstimado: m.costo_estimado,
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
        return {
          id: padre.clienteId,
          razonSocial: "Cliente " + padre.clienteId.substring(0, 8),
          nit: "1020304050",
          estado: "activo",
          lineaCredito: 100000.0
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
      const url = `${URL_CREATIVIDADES}/api/v1/briefs?campana_id=${padre.id}`;
      const headers: Record<string, string> = {};
      if (contexto.token) headers["Authorization"] = contexto.token;

      const res = await peticionSegura<any[]>(url, { headers });
      if (!res || !Array.isArray(res)) return [];
      return [];
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
        sagaId: datos.saga_id,
        estado: datos.estado,
        mensaje: datos.mensaje
      };
    }
  }
};
