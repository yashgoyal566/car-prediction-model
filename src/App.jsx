import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BarChart3, CarFront, CheckCircle2, ChevronDown,
  CircleDollarSign, Gauge, LoaderCircle, Menu, Search, ShieldCheck, Sparkles, X
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  : (import.meta.env.DEV ? 'http://localhost:8000' : '')

const initialForm = {
  carName: '', brand: '', model: '', vehicleAge: '', fuelType: '', transmission: '',
  kmDriven: '', mileage: '', engine: '', sellerType: '', maxPower: '', seats: '',
}

/* ─── Searchable dropdown for car name ─── */
function SearchableSelect({ label, name, options, value, onChange, error, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = (option) => {
    onChange({ target: { name, value: option } })
    setQuery('')
    setOpen(false)
  }

  return <div ref={wrapperRef} className="relative">
    <label className="field-label" htmlFor={name}>{label}</label>
    <div className="relative">
      <input
        id={name}
        type="text"
        placeholder={disabled ? 'Loading catalog…' : 'Type to search…'}
        disabled={disabled}
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={(e) => setQuery(e.target.value)}
        className={`field-control pr-10 ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
        autoComplete="off"
      />
      <Search className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
    </div>
    {open && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
      {filtered.length === 0
        ? <p className="px-4 py-3 text-sm text-slate-400">No matches found</p>
        : filtered.map(option => (
          <button key={option} type="button" onClick={() => handleSelect(option)}
            className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
            {option}
          </button>
        ))}
    </div>}
    {error && <p className="field-error">{error}</p>}
  </div>
}

/* ─── Standard field (input or select) ─── */
function Field({ label, name, type = 'text', placeholder, options, value, onChange, error, suffix, disabled, readOnly }) {
  return <div>
    <label className="field-label" htmlFor={name}>{label}</label>
    <div className="relative">
      {options ? <>
        <select id={name} name={name} value={value} onChange={onChange} disabled={disabled}
          className={`field-control appearance-none ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''} ${disabled ? 'cursor-not-allowed bg-slate-50' : ''}`}>
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
      </> : <>
        <input id={name} name={name} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined}
          placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly} disabled={disabled}
          className={`field-control ${suffix ? 'pr-14' : ''} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''} ${readOnly ? 'cursor-default bg-slate-50' : ''} ${disabled ? 'cursor-not-allowed bg-slate-50' : ''}`} />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-3.5 text-xs font-medium text-slate-400">{suffix}</span>}
      </>}
    </div>
    {error && <p className="field-error">{error}</p>}
  </div>
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)

  /* ─── Catalog state ─── */
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/catalog`)
      .then(res => { if (!res.ok) throw new Error('Bad response'); return res.json() })
      .then(data => setCatalog(data))
      .catch(() => setCatalogError('Cannot reach the prediction service. Please ensure the backend server is running and accessible.'))
  }, [])

  const changeForm = (event) => {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
    setErrors(previous => ({ ...previous, [name]: '' }))
    setRequestError('')

    /* Auto-fill brand & model when a car name is selected */
    if (name === 'carName' && catalog?.car_name_map?.[value]) {
      const mapped = catalog.car_name_map[value]
      setForm(prev => ({ ...prev, [name]: value, brand: mapped.brand, model: mapped.model }))
      setErrors(prev => ({ ...prev, brand: '', model: '' }))
    }
  }

  const validate = () => {
    const next = {}
    ;['carName', 'brand', 'model', 'vehicleAge', 'fuelType', 'transmission', 'kmDriven', 'mileage', 'engine', 'sellerType', 'maxPower', 'seats'].forEach(key => {
      if (!form[key]) next[key] = 'This field is required.'
    })
    if (form.vehicleAge && Number(form.vehicleAge) > 40) next.vehicleAge = 'Enter a valid vehicle age (0-40).'
    if (form.mileage && Number(form.mileage) > 100) next.mileage = 'Enter a valid mileage (up to 100 km/l).'
    if (form.kmDriven && Number(form.kmDriven) < 1) next.kmDriven = 'Must be at least 1 km.'
    if (form.engine && Number(form.engine) < 1) next.engine = 'Enter a valid engine capacity.'
    if (form.maxPower && Number(form.maxPower) < 1) next.maxPower = 'Enter a valid max power.'
    return next
  }

  const predict = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setResult(null)
    setRequestError('')
    if (Object.keys(nextErrors).length) return
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          car_name: form.carName,
          brand: form.brand,
          model: form.model,
          vehicle_age: Number(form.vehicleAge),
          km_driven: Number(form.kmDriven),
          seller_type: form.sellerType,
          fuel_type: form.fuelType,
          transmission_type: form.transmission,
          mileage: Number(form.mileage),
          engine: Number(form.engine),
          max_power: Number(form.maxPower),
          seats: Number(form.seats),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const message = Array.isArray(data.detail)
          ? data.detail.map(item => item.msg?.replace(/^Value error, /, '') || 'Invalid input.').join(' ')
          : data.detail
        throw new Error(message || 'The prediction service could not process this vehicle.')
      }
      setResult({ estimate: data.predicted_price, low: data.price_range.low, high: data.price_range.high })
      document.getElementById('prediction-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch (error) {
      setRequestError(error.message === 'Failed to fetch' ? 'Cannot reach the prediction service. Please verify backend URL and service status.' : error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const currency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

  const catalogReady = catalog !== null
  const carNameOptions = catalog?.car_names || []
  const fuelOptions = catalog?.fuel_types || []
  const transmissionOptions = catalog?.transmission_types || []
  const sellerOptions = catalog?.seller_types || []
  const seatOptions = catalog?.seats?.map(String) || []

  return <div className="min-h-screen overflow-x-hidden">
    <nav className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#top" className="flex items-center gap-3 text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 shadow-lg shadow-slate-900/15"><CarFront className="h-5 w-5 text-white" /></span>
          <span className="font-['Manrope'] text-base font-extrabold tracking-tight">AutoValue</span>
          <span className="hidden rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 sm:inline">Predict</span>
        </a>
        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#predict" className="transition hover:text-slate-950">Price estimator</a>
          <a href="#how-it-works" className="transition hover:text-slate-950">How it works</a>
          <a href="#predict" className="rounded-lg bg-slate-900 px-4 py-2.5 text-white transition hover:bg-slate-700">Get an estimate</a>
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="rounded-lg p-2 text-slate-700 md:hidden" aria-label="Toggle navigation">{mobileMenu ? <X /> : <Menu />}</button>
      </div>
      {mobileMenu && <div className="border-t border-slate-100 px-5 py-4 md:hidden"><div className="flex flex-col gap-3 text-sm font-medium"><a href="#predict" onClick={() => setMobileMenu(false)}>Price estimator</a><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a></div></div>}
    </nav>

    <main id="top">
      <section className="relative isolate overflow-hidden bg-white pb-16 pt-16 sm:pb-20 sm:pt-24">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_#e0f2fe_0%,_transparent_68%)]" />
        <div className="mx-auto max-w-7xl px-5 text-center lg:px-8">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"><Sparkles className="h-3.5 w-3.5" /> SMARTER USED-CAR VALUATION</div>
          <h1 className="mx-auto mt-6 max-w-4xl font-['Manrope'] text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Know your car's worth <span className="text-sky-600">before you sell.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Get a transparent estimated value for your pre-owned car using key vehicle details—all in one simple, guided experience.</p>
          <a href="#predict" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700">Estimate your car <ArrowRight className="h-4 w-4" /></a>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            {[['Instant', 'valuation preview'], ['12', 'vehicle inputs'], ['ML', 'powered estimate']].map(([value, text]) => <div key={value} className="px-2"><p className="font-['Manrope'] text-xl font-extrabold text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section id="predict" className="scroll-mt-4 border-y border-slate-200 bg-slate-100/70 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 max-w-2xl"><p className="text-sm font-bold uppercase tracking-widest text-sky-700">Car valuation</p><h2 className="mt-2 font-['Manrope'] text-3xl font-extrabold tracking-tight text-slate-950">Tell us about your vehicle</h2><p className="mt-2 text-sm leading-6 text-slate-600">Complete the details below to view a demonstration price estimate.</p></div>

          {/* Catalog error banner */}
          {catalogError && <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div><p className="font-bold">Backend unavailable</p><p className="mt-1">{catalogError}</p></div>
          </div>}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <form onSubmit={predict} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
              <div className="mb-7 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-700"><CarFront className="h-5 w-5" /></span><div><h3 className="font-['Manrope'] font-bold text-slate-950">Vehicle details</h3><p className="text-xs text-slate-500">Basic identification and ownership information</p></div></div>
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                <SearchableSelect label="Car name" name="carName" options={carNameOptions} value={form.carName} onChange={changeForm} error={errors.carName} disabled={!catalogReady} />
                <Field label="Brand" name="brand" value={form.brand} onChange={changeForm} error={errors.brand} readOnly={!!form.carName && catalogReady} placeholder="Auto-filled from car name" />
                <Field label="Car model" name="model" value={form.model} onChange={changeForm} error={errors.model} readOnly={!!form.carName && catalogReady} placeholder="Auto-filled from car name" />
                <Field label="Vehicle age" name="vehicleAge" type="number" placeholder="e.g. 5" suffix="years" value={form.vehicleAge} onChange={changeForm} error={errors.vehicleAge} />
                <Field label="Fuel type" name="fuelType" options={fuelOptions} value={form.fuelType} onChange={changeForm} error={errors.fuelType} disabled={!catalogReady} />
                <Field label="Transmission" name="transmission" options={transmissionOptions} value={form.transmission} onChange={changeForm} error={errors.transmission} disabled={!catalogReady} />
                <Field label="Kilometers driven" name="kmDriven" type="number" placeholder="e.g. 42000" suffix="km" value={form.kmDriven} onChange={changeForm} error={errors.kmDriven} />
                <Field label="Mileage" name="mileage" type="number" placeholder="e.g. 21.4" suffix="km/l" value={form.mileage} onChange={changeForm} error={errors.mileage} />
                <Field label="Engine" name="engine" type="number" placeholder="e.g. 1197" suffix="cc" value={form.engine} onChange={changeForm} error={errors.engine} />
              </div>
              <div className="my-8 border-t border-slate-100" />
              <div className="mb-7 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><CircleDollarSign className="h-5 w-5" /></span><div><h3 className="font-['Manrope'] font-bold text-slate-950">Listing & performance</h3><p className="text-xs text-slate-500">Seller profile and current market information</p></div></div>
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Seller type" name="sellerType" options={sellerOptions} value={form.sellerType} onChange={changeForm} error={errors.sellerType} disabled={!catalogReady} />
                <Field label="Max power" name="maxPower" type="number" placeholder="e.g. 81.8" suffix="bhp" value={form.maxPower} onChange={changeForm} error={errors.maxPower} />
                <Field label="Seats" name="seats" options={seatOptions} value={form.seats} onChange={changeForm} error={errors.seats} disabled={!catalogReady} />
              </div>
              {requestError && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{requestError}</div>}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Your details are sent to the local prediction model only when you submit.</p><button disabled={isLoading || !catalogReady} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:bg-slate-400">{isLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Calculating estimate...</> : <><BarChart3 className="h-4 w-4" /> Predict price</>}</button></div>
            </form>
            <aside id="prediction-result" className="scroll-mt-8 lg:sticky lg:top-6 lg:h-fit">
              {result ? <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-card"><div className="flex items-center gap-2 text-sm font-bold text-sky-700"><CheckCircle2 className="h-5 w-5" /> Your estimated value</div><p className="mt-5 font-['Manrope'] text-4xl font-extrabold tracking-tight text-slate-950">{currency(result.estimate)}</p><p className="mt-1 text-sm text-slate-500">Predicted by the trained price model</p><div className="my-6 h-px bg-slate-100" /><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Expected price range</p><p className="mt-2 text-base font-bold text-slate-800">{currency(result.low)} – {currency(result.high)}</p><div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-700">Car summary</p><p className="mt-1 text-sm text-slate-600">{form.brand} {form.carName} · {form.vehicleAge} years · {form.kmDriven} km</p></div></div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center lg:p-8"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Gauge className="h-6 w-6" /></span><h3 className="mt-4 font-['Manrope'] font-bold text-slate-900">Your estimate will appear here</h3><p className="mt-2 text-sm leading-6 text-slate-500">Fill in all the vehicle details and select Predict price to see the model result.</p></div>}
              <div className="mt-5 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-emerald-800">Your entries are used only to obtain this local model prediction.</p></div>
            </aside>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-16"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-widest text-sky-700">Simple by design</p><h2 className="mt-2 font-['Manrope'] text-3xl font-extrabold tracking-tight text-slate-950">Built for a clear valuation journey</h2></div><div className="mt-9 grid gap-5 md:grid-cols-3">{[['01', 'Add vehicle facts', 'Enter the essential specifications, usage, and listing details.'], ['02', 'Review your inputs', 'Helpful labels and validation make it easier to complete every field.'], ['03', 'View the estimate', 'See an indicative price, range, and vehicle summary in one place.']].map(([number, title, body]) => <article key={number} className="rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:shadow-card"><p className="font-['Manrope'] text-sm font-extrabold text-sky-600">{number}</p><h3 className="mt-4 font-['Manrope'] text-lg font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}</div></div></section>
    </main>
    <footer className="border-t border-slate-200 bg-white py-7"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>© 2026 AutoValue. Used Car Price Prediction System.</p><p>Frontend + ML prediction service</p></div></footer>
  </div>
}

export default App
