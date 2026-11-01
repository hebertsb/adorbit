<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Excepciones\ErrorNegocio;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\Decimal128;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;
use MongoDB\Laravel\Connection;

class ClienteRepository
{
    /** @param  array<string, mixed>  $datos */
    public function crear(array $datos): Cliente
    {
        return Cliente::create($datos);
    }

    public function buscar(string $id): ?Cliente
    {
        return Cliente::where('id', $id)->first();
    }

    public function buscar_o_fallar(string $id): Cliente
    {
        return $this->buscar($id) ?? throw ErrorNegocio::no_encontrado('No existe el cliente');
    }

    /**
     * @param  array<string, mixed>  $cambios
     * @return bool false si la version no coincide (alguien lo modifico antes)
     */
    public function actualizar_con_version(string $id, int $version, array $cambios): bool
    {
        $cambios['version'] = $version + 1;
        $cambios['actualizado_en'] = new UTCDateTime;

        return Cliente::where('id', $id)->where('version', $version)->update($cambios) === 1;
    }

    /** @return array{0: list<Cliente>, 1: int} */
    public function listar(?string $estado, ?string $texto, ?string $solo_id, int $page, int $size): array
    {
        $consulta = Cliente::query();
        if ($solo_id !== null) {
            $consulta->where('id', $solo_id);
        }
        if ($estado !== null) {
            $consulta->where('estado', $estado);
        }
        if ($texto !== null && $texto !== '') {
            $consulta->where('razon_social', 'regex', '/'.preg_quote($texto, '/').'/i');
        }
        $total = (clone $consulta)->count();
        $items = $consulta->orderBy('creado_en', 'desc')->skip($page * $size)->take($size)->get()->all();

        return [$items, $total];
    }

    /**
     * Reserva atomica: una sola actualizacion condicional. Devuelve true si habia disponible
     * (limite - usado >= monto), cliente activo y misma moneda.
     */
    public function reservar_credito(string $cliente_id, string $monto, string $moneda): bool
    {
        $resultado = $this->coleccion()->updateOne(
            [
                'id' => $cliente_id,
                'estado' => 'activo',
                'linea_credito.moneda' => $moneda,
                '$expr' => ['$gte' => [
                    ['$subtract' => ['$linea_credito.limite', '$linea_credito.usado']],
                    new Decimal128($monto),
                ]],
            ],
            [
                '$inc' => ['linea_credito.usado' => new Decimal128($monto)],
                '$set' => ['actualizado_en' => new UTCDateTime],
            ],
            $this->opciones(),
        );

        return $resultado->getModifiedCount() === 1;
    }

    public function devolver_credito(string $cliente_id, string $monto): void
    {
        $this->coleccion()->updateOne(
            ['id' => $cliente_id],
            [
                '$inc' => ['linea_credito.usado' => new Decimal128('-'.$monto)],
                '$set' => ['actualizado_en' => new UTCDateTime],
            ],
            $this->opciones(),
        );
    }

    private function coleccion(): Collection
    {
        return $this->conexion()->getCollection('clientes');
    }

    /** @return array<string, mixed> */
    private function opciones(): array
    {
        $sesion = $this->conexion()->getSession();

        return $sesion === null ? [] : ['session' => $sesion];
    }

    private function conexion(): Connection
    {
        /** @var Connection $conexion */
        $conexion = DB::connection('mongodb');

        return $conexion;
    }
}
