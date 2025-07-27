-- Crear tabla para presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    detalles TEXT,
    fecha_limite DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla para archivos adjuntos
CREATE TABLE IF NOT EXISTS archivos_adjuntos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    presupuesto_id UUID REFERENCES presupuestos(id) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    ruta_archivo TEXT NOT NULL,
    tipo_archivo TEXT NOT NULL,
    tamaño_archivo INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear bucket para archivos si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('presupuestos-archivos', 'presupuestos-archivos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para storage
CREATE POLICY "Permitir lectura de archivos" ON storage.objects
    FOR SELECT USING (bucket_id = 'presupuestos-archivos');

CREATE POLICY "Permitir subida de archivos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'presupuestos-archivos');

CREATE POLICY "Permitir eliminación de archivos" ON storage.objects
    FOR DELETE USING (bucket_id = 'presupuestos-archivos');
