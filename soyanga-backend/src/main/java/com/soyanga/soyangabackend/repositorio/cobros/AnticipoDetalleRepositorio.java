package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AnticipoDetalle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnticipoDetalleRepositorio extends JpaRepository<AnticipoDetalle, Long> {
    Optional<AnticipoDetalle> findByIdAnticipoAndIdPresentacion(Long idAnticipo, Long idPresentacion);
    List<AnticipoDetalle> findByIdAnticipo(Long idAnticipo);

}
