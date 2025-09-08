package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExistenciaLoteRepositorio extends BaseRepository<ExistenciaPorLote, Long> {

    Optional<ExistenciaPorLote> findByIdAlmacenAndIdLote(Long idAlmacen, Long idLote);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ExistenciaPorLote e where e.idAlmacen = :idAlmacen and e.idLote = :idLote")
    Optional<ExistenciaPorLote> lockByAlmacenAndIdLote(@Param("idAlmacen") Long idAlmacen,
                                                       @Param("idLote") Long idLote);

    @Query(value = """
        SELECT e.*
        FROM existencias_por_lote e
        JOIN lotes l ON l.id_lote = e.id_lote
        WHERE e.id_almacen = :almacenId
          AND l.id_presentacion = :presentacionId
          AND e.cantidad_disponible > 0
        ORDER BY l.fecha_vencimiento ASC, l.id_lote ASC
        LIMIT CAST(:lim AS INT)
        """, nativeQuery = true)
    List<ExistenciaPorLote> pickFefo(@Param("almacenId") Long almacenId,
                                     @Param("presentacionId") Long presentacionId,
                                     @Param("lim") int limit);
}
