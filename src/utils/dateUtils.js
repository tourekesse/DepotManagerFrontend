// src/utils/dateUtils.js
export function formatDateCI(iso) {
    if (!iso) return '—';

    // Corrige les fractions de seconde trop longues (ex: .5779)
    let safeIso = iso.replace(/\.(\d{3})\d+/, '.$1');
    // Si toujours pas valide, retire complètement la fraction
    if (isNaN(new Date(safeIso).getTime())) {
        safeIso = iso.replace(/\.(\d+)(Z|$)/, '$2');
    }
    const d = new Date(safeIso);
    if (isNaN(d.getTime())) return '—';

    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
