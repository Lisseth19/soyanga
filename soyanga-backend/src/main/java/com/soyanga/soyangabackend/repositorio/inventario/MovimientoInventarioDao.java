package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dto.inventario.MovimientoInventarioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class MovimientoInventarioDao {

    private final NamedParameterJdbcTemplate jdbc;

    public List<MovimientoInventarioResponse> ultimos(Long loteId, Long almacenId, int limite) {
        if (limite <= 0 || limite > 200) limite = 50;

        String sql = """
            SELECT
              mi.fecha_movimiento  AS fecha_movimiento,
              mi.tipo_movimiento   AS tipo_movimiento,
              mi.cantidad          AS cantidad,
              ao.nombre_almacen    AS almacen_origen,
              ad.nombre_almacen    AS almacen_destino,
              mi.referencia_modulo AS referencia_modulo,
              mi.id_referencia     AS id_referencia,
              mi.observaciones     AS observaciones
            FROM movimientos_de_inventario mi
            LEFT JOIN almacenes ao ON ao.id_almacen = mi.id_almacen_origen
            LEFT JOIN almacenes ad ON ad.id_almacen = mi.id_almacen_destino
            WHERE mi.id_lote = :loteId
              AND ( :almacenId IS NULL
                    OR mi.id_almacen_origen = :almacenId
                    OR mi.id_almacen_destino = :almacenId )
            ORDER BY mi.fecha_movimiento DESC
            LIMIT :limite
            """;

        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("loteId", loteId, Types.BIGINT)
                // 👇 tipamos explícitamente para evitar "no se pudo determinar el tipo del parámetro"
                .addValue("almacenId", almacenId, Types.BIGINT)
                .addValue("limite", limite, Types.INTEGER);

        return jdbc.query(sql, p, (rs, i) -> MovimientoInventarioResponse.builder()
                .fechaMovimiento(rs.getObject("fecha_movimiento", LocalDateTime.class)) // 👈 LocalDateTime
                .tipoMovimiento(rs.getString("tipo_movimiento"))
                .cantidad(rs.getBigDecimal("cantidad"))
                .almacenOrigen(rs.getString("almacen_origen"))
                .almacenDestino(rs.getString("almacen_destino"))
                .referenciaModulo(rs.getString("referencia_modulo"))
                .idReferencia(rs.getLong("id_referencia"))
                .observaciones(rs.getString("observaciones"))
                .build());
    }
}
