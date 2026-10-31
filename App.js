import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity as T, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

// ===== Configuración (la llave anon es pública; la seguridad la dan las políticas RLS de Supabase) =====
const SB_URL = 'https://bwcluuunbaxpmdpscekg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y2x1dXVuYmF4cG1kcHNjZWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODM3NDYsImV4cCI6MjEwODk1OTc0Nn0.0Pi0yGf_fHVBjWJJdlkxO6yVvEa1_RBY4-izbsMCDCs';
const WEB = 'https://yersonmorenodiaz7-cmyk.github.io/cerquita-transporte/';
const supabase = createClient(SB_URL, SB_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });

const C = { p: '#1769ff', d: '#12a150', bg: '#f4f6f8', card: '#fff', br: '#dfe4e9', mut: '#66727e', fg: '#10181f', red: '#d92d3a' };
const ST = { searching: 'Buscando ofertas', accepted: 'Conductor en camino', arrived: 'Tu conductor llegó', ongoing: 'En viaje', completed: 'Viaje finalizado', cancelled: 'Cancelado', expired: 'Expirado' };
const ACT = ['searching', 'accepted', 'arrived', 'ongoing'];
const $c = n => '$' + Math.round(n || 0).toLocaleString('es-CO');
const hav = (a, b) => { const t = x => x * Math.PI / 180, h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const q = async p => { const { data, error } = await p; if (error) { console.log(error.message); return undefined; } return data; };
const m = async p => { const { error } = await p; if (error) { Alert.alert('CERQUITA', error.message); return false; } return true; };
const nameOf = async (lat, lng) => { try { const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }); return [a?.street || a?.name, a?.district || a?.city].filter(Boolean).join(', ') || 'Punto seleccionado'; } catch (e) { return 'Punto seleccionado'; } };
const pt = o => ({ latitude: o.lat, longitude: o.lng });

// ===== Componentes básicos =====
const Btn = ({ t, onPress, color = C.p, ghost, small, style }) => (
  <T onPress={onPress} style={[s.btn, { backgroundColor: ghost ? 'transparent' : color, borderColor: ghost ? C.br : color, paddingVertical: small ? 8 : 13 }, style]}>
    <Text style={{ color: ghost ? C.fg : '#fff', fontWeight: '700' }}>{t}</Text>
  </T>
);
const Chip = ({ t, on, onPress, color }) => (
  <T onPress={onPress} style={[s.chip, on && { backgroundColor: color, borderColor: color }]}><Text style={{ color: on ? '#fff' : C.fg }}>{t}</Text></T>
);
const Card = ({ children }) => <View style={s.card}>{children}</View>;
const Mut = ({ children }) => <Text style={{ color: C.mut, fontSize: 13 }}>{children}</Text>;
const Input = props => <TextInput placeholderTextColor={C.mut} {...props} style={[s.input, props.style]} />;

// ===== Raíz: sesión =====
export default function App() {
  const [session, setSession] = useState(null), [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: l } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => l.subscription.unsubscribe();
  }, []);
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      {!ready ? <ActivityIndicator style={{ flex: 1 }} size="large" color={C.p} /> : session ? <Main user={session.user} /> : <Auth />}
    </View>
  );
}

function Auth() {
  const [up, setUp] = useState(false), [email, setEmail] = useState(''), [pass, setPass] = useState(''), [name, setName] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (!email || pass.length < 6) return Alert.alert('CERQUITA', 'Escribe tu correo y una contraseña de mínimo 6 caracteres.');
    setBusy(true);
    if (!up) { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass }); if (error) Alert.alert('CERQUITA', error.message); }
    else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { full_name: name } } });
      if (error) Alert.alert('CERQUITA', error.message); else if (!data.session) Alert.alert('CERQUITA', 'Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.');
    }
    setBusy(false);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
      <Text style={[s.logo, { fontSize: 32 }]}>📍 CERQUITA</Text>
      <Mut>Movilidad, cercanía, confianza y rapidez</Mut>
      <Card>
        <Text style={s.h}>{up ? 'Crear cuenta' : 'Ingresar'}</Text>
        {up && <Input placeholder="Nombre completo" value={name} onChangeText={setName} />}
        <Input placeholder="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input placeholder="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
        <Btn t={busy ? 'Un momento…' : up ? 'Registrarme' : 'Entrar'} onPress={go} />
        <Btn t={up ? 'Ya tengo cuenta' : 'Crear cuenta'} ghost onPress={() => setUp(!up)} style={{ marginTop: 8 }} />
      </Card>
    </ScrollView>
  );
}

// ===== Principal: datos compartidos y tiempo real =====
function Main({ user }) {
  const uid = user.id;
  const [role, setRole] = useState('p'), [B, setB] = useState(null), [D, setD] = useState({});
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    const drv = (await q(supabase.from('drivers').select('*,vehicles(model,plate)').eq('user_id', uid).maybeSingle())) || null;
    const rides = (await q(supabase.from('rides').select('*').eq('passenger_id', uid).order('created_at', { ascending: false }).limit(30))) || [];
    const rated = new Set(((await q(supabase.from('ratings').select('ride_id').eq('from_user', uid))) || []).map(x => x.ride_id));
    const ride = rides.find(r => ACT.includes(r.status) || (r.status === 'completed' && !rated.has(r.id))) || null;
    let offers = [], pd = null, loc = null;
    if (ride) {
      if (ride.status === 'searching') offers = (await q(supabase.from('offers').select('*,drivers(display_name,rating_avg,vehicles(model,plate))').eq('ride_id', ride.id).eq('status', 'pending').order('price'))) || [];
      else if (ride.driver_id) {
        pd = (await q(supabase.from('drivers').select('user_id,display_name,rating_avg,vehicles(model,plate)').eq('id', ride.driver_id).maybeSingle())) || null;
        loc = (await q(supabase.from('driver_locations').select('lat,lng').eq('driver_id', ride.driver_id).maybeSingle())) || null;
      }
    }
    let req = [], mo = [], cur = null, dh = [], plan = null;
    if (drv) {
      if (drv.online && drv.status === 'approved') req = ((await q(supabase.from('rides').select('*').eq('status', 'searching').eq('category', drv.category).order('created_at', { ascending: false }))) || []).filter(r => r.passenger_id !== uid);
      mo = (await q(supabase.from('offers').select('ride_id,price').eq('driver_id', drv.id))) || [];
      cur = ((await q(supabase.from('rides').select('*,payments(commission_amount)').eq('driver_id', drv.id).in('status', ['accepted', 'arrived', 'ongoing']).limit(1))) || [])[0] || null;
      dh = (await q(supabase.from('payments').select('amount,commission_amount,rides!inner(driver_id,status)').eq('rides.driver_id', drv.id).eq('rides.status', 'completed').limit(100))) || [];
      plan = ((await q(supabase.from('driver_subscriptions').select('ends_at,plans(name,commission_pct)').eq('driver_id', drv.id).gt('ends_at', new Date().toISOString()).order('ends_at', { ascending: false }).limit(1))) || [])[0] || null;
    }
    setD({ drv, ride, offers, pd, loc, req, mo, cur, dh, plan });
  }, [uid]);

  useEffect(() => {
    (async () => {
      const p = await q(supabase.from('profiles').select('*').eq('id', uid).single());
      const cfg = await q(supabase.from('settings').select('*').single());
      const cats = Object.fromEntries(((await q(supabase.from('service_categories').select('*').eq('active', true))) || []).map(c => [c.code, c]));
      setB({ p, cfg, cats });
      refresh();
    })();
    const deb = () => { clearTimeout(timer.current); timer.current = setTimeout(refresh, 300); };
    const ch = supabase.channel('cq-' + uid);
    ['rides', 'offers', 'driver_locations'].forEach(t => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, deb));
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, p => Alert.alert(p.new.title, p.new.body || ''));
    ch.subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [uid, refresh]);

  if (!B || !B.cfg) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.p} />;
  const staff = ['operador', 'supervisor', 'admin'].includes(B.p?.role);
  const tabs = [['p', 'Pasajero', C.p], ['d', 'Conductor', C.d]].concat(staff ? [['a', 'Admin', '#6d4aff']] : []);
  const props = { uid, cfg: B.cfg, cats: B.cats, D, refresh };
  return (
    <View style={{ flex: 1 }}>
      <View style={s.top}>
        <Text style={s.logo}>📍 CERQUITA</Text>
        {tabs.map(([k, l, col]) => <Chip key={k} t={l} on={role === k} color={col} onPress={() => setRole(k)} />)}
        <Chip t="Salir" onPress={() => supabase.auth.signOut()} />
      </View>
      {role === 'p' && <Passenger {...props} />}
      {role === 'd' && <Driver {...props} />}
      {role === 'a' && <ScrollView contentContainerStyle={{ padding: 12 }}><Card><Text style={s.h}>Administración</Text><Mut>El panel de administración (conductores, tarifas, viajes y alertas) está en la versión web.</Mut><Btn t="Abrir panel web" color="#6d4aff" onPress={() => Linking.openURL(WEB)} style={{ marginTop: 10 }} /></Card></ScrollView>}
    </View>
  );
}

// ===== Reportar un problema (reclamaciones) =====
function Report({ uid, rideId }) {
  const [open, setOpen] = useState(false), [kind, setKind] = useState('Cobro'), [txt, setTxt] = useState('');
  const send = async () => {
    if (txt.trim().length < 10) return Alert.alert('CERQUITA', 'Cuéntanos qué pasó (mínimo 10 letras).');
    if (await m(supabase.from('claims').insert({ user_id: uid, ride_id: rideId || null, kind, description: txt.trim() }))) {
      Alert.alert('CERQUITA', 'Recibimos tu reclamación. Te responderemos pronto.'); setTxt(''); setOpen(false);
    }
  };
  if (!open) return <T onPress={() => setOpen(true)}><Text style={{ color: C.mut, textAlign: 'center', marginVertical: 10 }}>¿Tuviste un problema? Reportar</Text></T>;
  return (
    <Card>
      <Text style={s.h}>Reportar un problema</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {['Cobro', 'Conductor', 'Seguridad', 'Otro'].map(k => <Chip key={k} t={k} on={kind === k} color={C.p} onPress={() => setKind(k)} />)}
      </ScrollView>
      <Input placeholder="Cuéntanos qué pasó" value={txt} onChangeText={setTxt} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} maxLength={500} />
      <View style={s.row}><Btn t="Enviar" small onPress={send} /><Btn t="Cancelar" ghost small onPress={() => setOpen(false)} /></View>
    </Card>
  );
}

// ===== Chat del viaje (solo mientras el viaje está activo) =====
function Chat({ rideId, uid, who }) {
  const [msgs, setMsgs] = useState([]), [txt, setTxt] = useState('');
  const load = useCallback(async () => {
    const d = await q(supabase.from('messages').select('id,sender_id,body,created_at').eq('ride_id', rideId).order('created_at'));
    if (d) setMsgs(d);
  }, [rideId]);
  useEffect(() => {
    load();
    const ch = supabase.channel('chat-' + rideId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'ride_id=eq.' + rideId }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rideId, load]);
  const send = async () => {
    const b = txt.trim(); if (!b) return;
    setTxt('');
    await m(supabase.from('messages').insert({ ride_id: rideId, sender_id: uid, body: b }));
    load();
  };
  return (
    <Card>
      <Text style={s.h}>💬 Chat con {who}</Text>
      {msgs.length === 0 && <Mut>Escribe un mensaje para coordinar la recogida.</Mut>}
      {msgs.slice(-20).map(x => (
        <View key={x.id} style={{ alignSelf: x.sender_id === uid ? 'flex-end' : 'flex-start', backgroundColor: x.sender_id === uid ? C.p : C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 3, maxWidth: '80%' }}>
          <Text style={{ color: x.sender_id === uid ? '#fff' : C.fg }}>{x.body}</Text>
        </View>
      ))}
      <View style={[s.row, { marginTop: 8 }]}>
        <Input style={{ flex: 1, marginBottom: 0 }} placeholder="Escribe un mensaje" value={txt} onChangeText={setTxt} onSubmitEditing={send} returnKeyType="send" maxLength={500} />
        <Btn t="Enviar" small onPress={send} />
      </View>
    </Card>
  );
}

// ===== Pasajero =====
function Passenger({ uid, cfg, cats, D, refresh }) {
  const [o, setO] = useState(null), [d, setDest] = useState(null), [c, setC] = useState('carro'), [pr, setPr] = useState(null), [pay, setPay] = useState('efectivo'), [busy, setBusy] = useState(false), [oq, setOq] = useState(''), [dq, setDq] = useState('');
  const mr = useRef(null);
  const r = D.ride;
  useEffect(() => {
    (async () => {
      let lat = 6.3373, lng = -75.5579, ok = false;
      try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status === 'granted') { const p = (await Location.getCurrentPositionAsync({})).coords; lat = p.latitude; lng = p.longitude; ok = true; } } catch (e) {}
      const nm = ok ? await nameOf(lat, lng) : 'Parque de Bello';
      setO({ lat, lng, name: nm }); setOq(nm);
    })();
  }, []);
  useEffect(() => { if (o && !d && !r) mr.current?.animateToRegion({ latitude: o.lat, longitude: o.lng, latitudeDelta: .04, longitudeDelta: .04 }, 400); }, [o]);
  useEffect(() => {
    const pad = { top: 60, right: 60, bottom: 60, left: 60 };
    if (r) mr.current?.fitToCoordinates([{ latitude: r.origin_lat, longitude: r.origin_lng }, { latitude: r.dest_lat, longitude: r.dest_lng }], { edgePadding: pad, animated: true });
    else if (o && d) mr.current?.fitToCoordinates([pt(o), pt(d)], { edgePadding: pad, animated: true });
  }, [d, r?.id]);

  const k = (() => {
    if (!o || !d || !cats[c]) return null;
    const km = Math.max(.3, hav(o, d) * 1.3), kk = Math.round(km * 10) / 10, cc = cats[c];
    const ref = Math.round((cfg.base_fare * cc.base_multiplier + kk * cc.per_km) / 100) * 100;
    return { km: kk, min: Math.max(4, Math.ceil(km / (c === 'moto' ? 30 : 24) * 60)), ref, lo: Math.ceil(ref * cfg.min_offer_pct / 100), hi: Math.floor(ref * cfg.max_offer_pct / 100) };
  })();
  const price = pr ?? k?.ref ?? 0;

  // Búsqueda de direcciones escritas (geocodificación)
  const geo = async text => {
    try {
      const res = await Location.geocodeAsync(`${text}, Antioquia, Colombia`);
      if (!res.length) return null;
      const { latitude: lat, longitude: lng } = res[0];
      return { lat, lng, name: await nameOf(lat, lng) };
    } catch (e) { return null; }
  };
  const findO = async () => { if (!oq.trim()) return; const g = await geo(oq); if (!g) return Alert.alert('CERQUITA', 'No encontré esa dirección. Prueba con calle, número y barrio (ej: Calle 50 #45-10, Bello).'); setO(g); setOq(g.name); };
  const findD = async () => { if (!dq.trim()) return; const g = await geo(dq); if (!g) return Alert.alert('CERQUITA', 'No encontré esa dirección. Prueba con calle, número y barrio, o toca el mapa.'); setPr(null); setDest(g); setDq(g.name); };
  const myLoc = async () => { try { const p = (await Location.getCurrentPositionAsync({})).coords; const nm = await nameOf(p.latitude, p.longitude); setO({ lat: p.latitude, lng: p.longitude, name: nm }); setOq(nm); } catch (e) { Alert.alert('CERQUITA', 'Activa el GPS y el permiso de ubicación.'); } };

  const pick = async e => { if (r) return; const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate; setPr(null); const nm = await nameOf(lat, lng); setDest({ lat, lng, name: nm }); setDq(nm); };
  const request = async () => {
    if (!k) return Alert.alert('CERQUITA', 'Toca el mapa para elegir tu destino.');
    if (price < k.lo || price > k.hi) return Alert.alert('CERQUITA', `Tu oferta debe estar entre ${$c(k.lo)} y ${$c(k.hi)}.`);
    setBusy(true);
    const ok = await m(supabase.from('rides').insert({ passenger_id: uid, category: c, origin_name: o.name, origin_lat: o.lat, origin_lng: o.lng, dest_name: d.name, dest_lat: d.lat, dest_lng: d.lng, offered_fare: price, payment_method: pay }));
    setBusy(false); if (ok) { setPr(null); setDest(null); refresh(); }
  };
  const accept = async id => { const { error } = await supabase.rpc('accept_offer', { p_offer: id }); if (error) Alert.alert('CERQUITA', 'La oferta ya no está disponible.'); refresh(); };
  const cancel = async id => { const { error } = await supabase.rpc('cancel_ride', { p_ride: id }); if (error) Alert.alert('CERQUITA', error.message); refresh(); };
  const rate = async n => { if (D.pd && await m(supabase.from('ratings').insert({ ride_id: r.id, from_user: uid, to_user: D.pd.user_id, stars: n }))) refresh(); };
  const sos = async () => { if (await m(supabase.from('sos_alerts').insert({ ride_id: r?.id, user_id: uid, lat: o?.lat, lng: o?.lng }))) Alert.alert('CERQUITA', 'Alerta enviada al centro de operaciones.'); };

  const veh = D.pd?.vehicles?.[0];
  const A = r ? { lat: r.origin_lat, lng: r.origin_lng } : o, B = r ? { lat: r.dest_lat, lng: r.dest_lng } : d;
  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mr} style={{ height: 280 }} showsUserLocation onPress={pick} initialRegion={{ latitude: 6.3373, longitude: -75.5579, latitudeDelta: .06, longitudeDelta: .06 }}>
        {A && <Marker coordinate={pt(A)} pinColor="green" title="Origen" />}
        {B && <Marker coordinate={pt(B)} pinColor="red" title="Destino" />}
        {A && B && <Polyline coordinates={[pt(A), pt(B)]} strokeColor={C.p} strokeWidth={3} />}
        {D.loc && <Marker coordinate={pt(D.loc)} title="Tu conductor"><Text style={{ fontSize: 28 }}>🚕</Text></Marker>}
      </MapView>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {!r && (
          <Card>
            <Text style={s.h}>¿A dónde vas?</Text>
            <Mut>Dirección de recogida</Mut>
            <View style={[s.row, { marginBottom: 8 }]}>
              <Input style={{ flex: 1, marginBottom: 0 }} placeholder="¿Dónde te recogemos?" value={oq} onChangeText={setOq} onSubmitEditing={findO} returnKeyType="search" />
              <Btn t="Buscar" small onPress={findO} />
            </View>
            <T onPress={myLoc}><Text style={{ color: C.p, marginBottom: 8 }}>📍 Usar mi ubicación actual</Text></T>
            <Mut>Dirección de destino</Mut>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Input style={{ flex: 1, marginBottom: 0 }} placeholder="¿A dónde vas?" value={dq} onChangeText={setDq} onSubmitEditing={findD} returnKeyType="search" />
              <Btn t="Buscar" small onPress={findD} />
            </View>
            <Mut>También puedes tocar el mapa para marcar el destino.</Mut>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {Object.values(cats).map(x => <Chip key={x.code} t={x.name.replace('CERQUITA ', '')} on={c === x.code} color={C.p} onPress={() => { setC(x.code); setPr(null); }} />)}
            </ScrollView>
            {k && <>
              <Mut>{k.km} km · ~{k.min} min · Referencia {$c(k.ref)} (puedes ofertar entre {$c(k.lo)} y {$c(k.hi)})</Mut>
              <View style={s.row}><Btn t="−" ghost small onPress={() => setPr(Math.max(500, price - 500))} /><Text style={s.price}>{$c(price)}</Text><Btn t="+" ghost small onPress={() => setPr(price + 500)} /></View>
            </>}
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['billetera', 'Billetera']].map(([v, l]) => <Chip key={v} t={l} on={pay === v} color={C.p} onPress={() => setPay(v)} />)}
            </View>
            <Btn t={busy ? 'Enviando…' : 'Proponer mi precio'} onPress={request} />
          </Card>
        )}
        {r && r.status === 'searching' && (
          <Card>
            <Text style={s.h}>Ofertas recibidas ({D.offers.length}/{cfg.max_offers})</Text>
            <Mut>Tu precio {$c(r.offered_fare)} · referencia {$c(r.reference_fare)}</Mut>
            {D.offers.length === 0 && <Text style={{ marginVertical: 12, color: C.mut }}>Esperando conductores cercanos…</Text>}
            {D.offers.map(f => (
              <View key={f.id} style={s.offer}>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{f.drivers?.display_name} ★ {f.drivers?.rating_avg}</Text><Mut>{f.drivers?.vehicles?.[0]?.model} · llega en {f.eta_minutes} min</Mut></View>
                <Text style={{ fontWeight: '800', marginHorizontal: 10 }}>{$c(f.price)}</Text>
                <Btn t="Aceptar" small onPress={() => accept(f.id)} />
              </View>
            ))}
            <Btn t="Cancelar solicitud" ghost small onPress={() => cancel(r.id)} style={{ marginTop: 10 }} />
          </Card>
        )}
        {r && r.status === 'completed' && (
          <Card>
            <Text style={s.h}>Llegaste a tu destino</Text>
            <Text>Total: {$c(r.agreed_fare)} · {r.payment_method}</Text>
            <Mut>Califica a {D.pd?.display_name}</Mut>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>{[1, 2, 3, 4, 5].map(n => <Chip key={n} t={`${n} ★`} color={C.p} onPress={() => rate(n)} />)}</View>
          </Card>
        )}
        {r && ['accepted', 'arrived', 'ongoing'].includes(r.status) && (
          <Card>
            <Text style={s.h}>{ST[r.status]}</Text>
            <Text style={{ fontWeight: '700' }}>{D.pd?.display_name} ★ {D.pd?.rating_avg} · {veh?.model} · {veh?.plate}</Text>
            <Mut>Tarifa acordada {$c(r.agreed_fare)} · {r.payment_method}</Mut>
            <View style={[s.row, { marginTop: 10 }]}>
              <Btn t="🆘 Emergencia" color={C.red} small onPress={sos} />
              {r.status === 'accepted' && <Btn t="Cancelar" ghost small onPress={() => cancel(r.id)} />}
            </View>
          </Card>
        )}
        {r && ['accepted', 'arrived', 'ongoing'].includes(r.status) && <Chat rideId={r.id} uid={uid} who={D.pd?.display_name || 'tu conductor'} />}
        <Report uid={uid} rideId={r?.id} />
      </ScrollView>
    </View>
  );
}

// ===== Conductor =====
function Req({ r, mine, onOffer, onHide }) {
  const [v, setV] = useState('');
  return (
    <Card>
      <View style={s.row}><Text style={{ fontWeight: '700', flex: 1 }}>{r.origin_name} → {r.dest_name}</Text><Text style={{ fontWeight: '800' }}>{$c(r.offered_fare)}</Text></View>
      <Mut>{r.distance_km} km · ~{r.est_minutes} min · Referencia {$c(r.reference_fare)}</Mut>
      {mine ? <Mut>Oferta enviada por {$c(mine.price)}. Esperando al pasajero…</Mut> : (
        <View style={{ marginTop: 8 }}>
          <Btn t={`Aceptar ${$c(r.offered_fare)}`} color={C.d} small onPress={() => onOffer(r.id, r.offered_fare)} />
          <View style={[s.row, { marginTop: 8 }]}>
            <Input style={{ flex: 1, marginBottom: 0 }} placeholder="Contraoferta" keyboardType="numeric" value={v} onChangeText={setV} />
            <Btn t="Contraofertar" ghost small onPress={() => onOffer(r.id, +v)} />
            <Btn t="Rechazar" ghost small onPress={() => onHide(r.id)} />
          </View>
        </View>
      )}
    </Card>
  );
}

function Driver({ uid, cfg, cats, D, refresh }) {
  const drv = D.drv;
  const [f, setF] = useState({ name: '', cat: 'carro', model: '', plate: '', color: '' }), [hid, setHid] = useState([]);
  useEffect(() => {
    if (!drv?.online) return;
    let sub, alive = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !alive) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 8000 }, l =>
        m(supabase.from('driver_locations').upsert({ driver_id: drv.id, lat: l.coords.latitude, lng: l.coords.longitude, heading: l.coords.heading, updated_at: new Date().toISOString() })));
    })();
    return () => { alive = false; sub?.remove(); };
  }, [drv?.online, drv?.id]);

  const register = async () => {
    if (!f.name.trim() || !f.model.trim() || !f.plate.trim()) return Alert.alert('CERQUITA', 'Completa nombre, vehículo y placa.');
    const d = await q(supabase.from('drivers').insert({ user_id: uid, display_name: f.name.trim(), category: f.cat }).select().single());
    if (!d) return Alert.alert('CERQUITA', 'No se pudo registrar. Intenta de nuevo.');
    if (await m(supabase.from('vehicles').insert({ driver_id: d.id, model: f.model.trim(), plate: f.plate.trim().toUpperCase(), color: f.color || null }))) Alert.alert('CERQUITA', 'Registro enviado. Un administrador debe aprobarte.');
    refresh();
  };
  const online = async () => { if (await m(supabase.from('drivers').update({ online: !drv.online }).eq('id', drv.id))) refresh(); };
  const offer = async (rid, p) => { if (await m(supabase.from('offers').insert({ ride_id: rid, driver_id: drv.id, price: Math.round(p / 100) * 100, eta_minutes: 5 }))) refresh(); };
  const next = async id => { const { error } = await supabase.rpc('advance_ride', { p_ride: id }); if (error) Alert.alert('CERQUITA', error.message); refresh(); };

  if (!drv) return (
    <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.h}>Registrarme como conductor</Text>
        <Input placeholder="Nombre completo" value={f.name} onChangeText={v => setF({ ...f, name: v })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>{Object.values(cats).map(x => <Chip key={x.code} t={x.name.replace('CERQUITA ', '')} on={f.cat === x.code} color={C.d} onPress={() => setF({ ...f, cat: x.code })} />)}</ScrollView>
        <Input placeholder="Vehículo (marca y modelo)" value={f.model} onChangeText={v => setF({ ...f, model: v })} />
        <Input placeholder="Placa" autoCapitalize="characters" value={f.plate} onChangeText={v => setF({ ...f, plate: v })} />
        <Input placeholder="Color" value={f.color} onChangeText={v => setF({ ...f, color: v })} />
        <Btn t="Enviar registro" color={C.d} onPress={register} />
        <Mut>Los documentos (cédula, licencia, SOAT) se suben desde la versión web por ahora.</Mut>
      </Card>
    </ScrollView>
  );
  if (drv.status !== 'approved') return <ScrollView contentContainerStyle={{ padding: 12 }}><Card><Text style={s.h}>{drv.display_name}</Text><Text>Estado de tu cuenta: {{ pending: 'pendiente de aprobación', rejected: 'rechazada', suspended: 'suspendida' }[drv.status]}. Un administrador debe revisar tus documentos.</Text></Card></ScrollView>;

  const gross = D.dh.reduce((a, x) => a + x.amount, 0), net = gross - D.dh.reduce((a, x) => a + x.commission_amount, 0), v = drv.vehicles?.[0], cur = D.cur;
  const list = D.req.filter(x => !hid.includes(x.id));
  return (
    <View style={{ flex: 1 }}>
      {cur && (
        <MapView style={{ height: 240 }} showsUserLocation initialRegion={{ latitude: cur.origin_lat, longitude: cur.origin_lng, latitudeDelta: .05, longitudeDelta: .05 }}>
          <Marker coordinate={{ latitude: cur.origin_lat, longitude: cur.origin_lng }} pinColor="green" title="Recoger" />
          <Marker coordinate={{ latitude: cur.dest_lat, longitude: cur.dest_lng }} pinColor="red" title="Destino" />
          <Polyline coordinates={[{ latitude: cur.origin_lat, longitude: cur.origin_lng }, { latitude: cur.dest_lat, longitude: cur.dest_lng }]} strokeColor={C.d} strokeWidth={3} />
        </MapView>
      )}
      <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
        <View style={s.row}>
          <Card><Mut>Ganancias netas</Mut><Text style={s.kpi}>{$c(net)}</Text></Card>
          <Card><Mut>Servicios</Mut><Text style={s.kpi}>{D.dh.length}</Text></Card>
          <Card><Mut>Calificación</Mut><Text style={s.kpi}>★ {drv.rating_avg}</Text></Card>
        </View>
        <Card>
          <Text style={{ fontWeight: '700' }}>{v?.model} · {v?.plate} · {cats[drv.category]?.name}</Text>
          <Mut>{D.plan ? `Plan ${D.plan.plans?.name} · comisión ${D.plan.plans?.commission_pct}% · vence ${new Date(D.plan.ends_at).toLocaleDateString('es-CO')}` : `Comisión general ${cfg.commission_pct}%`}</Mut>
          <Btn t={drv.online ? 'Desconectarme' : 'Conectarme'} color={drv.online ? C.red : C.d} onPress={online} style={{ marginTop: 8 }} />
        </Card>
        {cur ? (
          <Card>
            <Text style={s.h}>{ST[cur.status]}</Text>
            <Text>{cur.passenger_name} · {cur.origin_name} → {cur.dest_name} · {cur.distance_km} km</Text>
            <Mut>Tarifa acordada {$c(cur.agreed_fare)} (neto {$c(cur.agreed_fare - ([].concat(cur.payments || [])[0]?.commission_amount ?? 0))}) · {cur.payment_method}</Mut>
            <Btn t={{ accepted: 'Confirmar llegada', arrived: 'Iniciar viaje', ongoing: 'Finalizar viaje' }[cur.status]} color={C.d} onPress={() => next(cur.id)} style={{ marginTop: 10 }} />
          </Card>
        ) : !drv.online ? <Mut>Conéctate para recibir solicitudes cercanas.</Mut> : (
          <>
            {list.length === 0 && <Mut>Sin solicitudes por ahora. Se actualizan en tiempo real.</Mut>}
            {list.map(x => <Req key={x.id} r={x} mine={D.mo.find(o => o.ride_id === x.id)} onOffer={offer} onHide={id => setHid([...hid, id])} />)}
          </>
        )}
        {cur && <Chat rideId={cur.id} uid={uid} who={cur.passenger_name || 'el pasajero'} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 50 },
  top: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 },
  logo: { fontWeight: '800', fontSize: 18, color: C.p, marginRight: 'auto' },
  card: { backgroundColor: C.card, borderColor: C.br, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  h: { fontSize: 16, fontWeight: '700', marginBottom: 6, color: C.fg },
  btn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: C.br, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6 },
  input: { borderWidth: 1, borderColor: C.br, backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 10, color: C.fg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price: { fontSize: 28, fontWeight: '800', color: C.fg },
  kpi: { fontSize: 18, fontWeight: '800', color: C.fg },
  offer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.br },
});
