// com.soyanga.soyangabackend.repositorio.precios.ConfiguracionPreciosRepositorio.java
package com.soyanga.soyangabackend.repositorio.precios;

import com.soyanga.soyangabackend.dominio.ConfiguracionPrecios;
import org.springframework.data.jpa.repository.*;

public interface ConfiguracionPreciosRepositorio extends JpaRepository<ConfiguracionPrecios, Long> {

    @Query("select c from ConfiguracionPrecios c order by c.id asc")
    java.util.List<ConfiguracionPrecios> findAllOrderById();

    default ConfiguracionPrecios unica() {
        var list = findAllOrderById();
        return list.isEmpty() ? null : list.get(0);
    }
}
