package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.CodigoBarras;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CodigoBarrasRepositorio extends BaseRepository<CodigoBarras, Long> {

    List<CodigoBarras> findByIdPresentacion(Long idPresentacion);

    // Exacto (suficiente para EAN/UPC que son numéricos)
    Optional<CodigoBarras> findFirstByCodigoBarras(String codigoBarras);

    // (Opcional) si algún día quieres ignorar mayúsc/minúsculas:
    @Query("SELECT c FROM CodigoBarras c WHERE UPPER(c.codigoBarras) = UPPER(:codigo)")
    Optional<CodigoBarras> findFirstIgnoreCase(@Param("codigo") String codigo);
}
