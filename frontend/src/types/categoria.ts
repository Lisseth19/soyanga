export interface Categoria {
  idCategoria: number;
  nombreCategoria: string;
  descripcion: string | null;
  idCategoriaPadre: number | null;
}

export interface CategoriaCrearDTO {
  nombreCategoria: string;
  descripcion?: string | null;
  idCategoriaPadre?: number | null;
}

export interface CategoriaEditarDTO extends CategoriaCrearDTO {}

export interface OpcionIdNombre {
  id: number;
  nombre: string;
}
