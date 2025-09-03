import { useEffect, useState } from 'react'
import { api } from '../servicios/api'

export default function Health() {
    const [data, setData] = useState<any>()
    const [err, setErr] = useState('')

    useEffect(() => {
        api('/api/health').then(setData).catch(e => setErr(String(e)))
    }, [])

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">API Health</h1>
            {err && <div className="text-red-600">Error: {err}</div>}
            {!data && !err && <div>Cargando…</div>}
            {data && (
                <pre className="p-4 rounded-lg border bg-neutral-50 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 shadow-sm overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
            )}
        </div>
    )
}
