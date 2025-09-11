package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Moneda;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MonedaRepositorio extends BaseRepository<Moneda, Long> {
    Optional<Moneda> findByCodigoMonedaIgnoreCase(String codigoMoneda);

    @Query("""
      SELECT m FROM Moneda m
      WHERE (:q = '' OR LOWER(m.codigoMoneda) LIKE LOWER(CONCAT('%', :q, '%'))
                     OR LOWER(m.nombreMoneda) LIKE LOWER(CONCAT('%', :q, '%')))
      ORDER BY m.codigoMoneda ASC
    """)
    Page<Moneda> buscar(@Param("q") String q, Pageable pageable);

    @Query("SELECT m FROM Moneda m WHERE m.esMonedaLocal = TRUE")
    Optional<Moneda> local();

    @Modifying
    @Query("UPDATE Moneda m SET m.esMonedaLocal = FALSE")
    void desmarcarTodas();

    @Modifying
    @Query("UPDATE Moneda m SET m.esMonedaLocal = FALSE WHERE m.idMoneda <> :id")
    void desmarcarLocalesExcepto(@Param("id") Long id);
}
