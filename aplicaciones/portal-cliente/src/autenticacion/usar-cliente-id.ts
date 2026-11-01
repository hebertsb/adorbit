import { useAutenticacion } from './contexto';

/** cliente_id del token. Solo se usa dentro de las rutas protegidas, donde ya se verifico que existe. */
export function useClienteId(): string {
  const { usuario } = useAutenticacion();
  if (!usuario?.clienteId) throw new Error('La sesion no identifica a un cliente');
  return usuario.clienteId;
}
