"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { enregistrerVinyle, identifier, retirerVinyle, verifierCode } from "./actions";

const GENRES = ["Rock", "Pop", "Jazz", "Hip-hop", "Électro", "Chanson française", "Soul/Funk", "Classique", "Reggae", "Metal", "Blues", "Folk", "Bande originale", "Autre"];
// Code d'accès gardé dans ce navigateur (comme le Pokédex). Le stockage peut
// être indisponible (navigation privée) : on fait alors sans.
const CLE = "vinyles-code";
const stockage = {
  lire: () => { try { return localStorage.getItem(CLE) || ""; } catch { return ""; } },
  ecrire: (v) => { try { localStorage.setItem(CLE, v); } catch {} },
  effacer: () => { try { localStorage.removeItem(CLE); } catch {} },
};

const VIDE = { artiste: "", titre: "", annee: "", label: "", genre: "", notes: "", pochette: "", mbid: "" };

// Réduit une photo (fichier) en JPEG de `cote` px maximum -> data URL.
function reduire(fichier, cote, qualite) {
  return new Promise((ok, ko) => {
    const img = new Image();
    const url = URL.createObjectURL(fichier);
    img.onload = () => {
      const r = Math.min(1, cote / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", qualite));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("Image illisible.")); };
    img.src = url;
  });
}

function Disque() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="currentColor" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="var(--sillon)" strokeWidth="1" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="var(--sillon)" strokeWidth="1" />
      <circle cx="50" cy="50" r="15" fill="var(--accent)" />
      <circle cx="50" cy="50" r="2.5" fill="var(--bg)" />
    </svg>
  );
}

function Pochette({ src, alt }) {
  const [erreur, setErreur] = useState(false);
  if (!src || erreur) return <span className="pochette vide"><Disque /></span>;
  return <img className="pochette" src={src} alt={alt} loading="lazy" onError={() => setErreur(true)} />;
}

// `cible` : null pour un nouveau vinyle, sinon le vinyle à modifier.
function Formulaire({ cible, code, onEnregistre, onFermer }) {
  const [etat, action, enCours] = useActionState(enregistrerVinyle, {});
  const [v, setV] = useState(cible || VIDE);
  const [photo, setPhoto] = useState("");
  const [lecture, setLecture] = useState({ enCours: false, msg: "", erreur: false });
  const champPhoto = useRef(null);

  useEffect(() => {
    if (etat?.ok) {
      onEnregistre(etat.data, etat.modif);
      if (!etat.modif) { setV(VIDE); setPhoto(""); setLecture({ enCours: false, msg: "", erreur: false }); }
    }
  }, [etat]); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (champ) => (e) => setV({ ...v, [champ]: e.target.value });

  async function photographier(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setLecture({ enCours: true, msg: "Reconnaissance de la pochette…", erreur: false });
    try {
      const [grande, vignette] = await Promise.all([reduire(fichier, 1024, 0.8), reduire(fichier, 240, 0.7)]);
      setPhoto(vignette);
      const fd = new FormData();
      fd.set("photo", grande);
      fd.set("code", code);
      const r = await identifier(fd);
      if (r.erreur) {
        setV((x) => ({ ...x, pochette: x.pochette || vignette }));
        setLecture({ enCours: false, msg: r.erreur, erreur: true });
        return;
      }
      const i = r.info;
      setV((x) => ({
        ...x,
        artiste: i.artiste, titre: i.titre, annee: i.annee, label: i.label, genre: i.genre,
        mbid: i.mbid, pochette: i.pochette || vignette,
      }));
      const doute = i.confiance === "haute" ? "" : " Vérifie les informations, la reconnaissance n’est pas certaine.";
      setLecture({ enCours: false, msg: `Reconnu : ${i.artiste} – ${i.titre}.${doute}`, erreur: i.confiance === "faible" });
    } catch (err) {
      setLecture({ enCours: false, msg: err.message || "Reconnaissance impossible.", erreur: true });
    }
  }

  const officielle = v.pochette.startsWith("https://");

  return (
    <form className="ajout" action={action} key={etat?.n || "f"}>
      <h2>{cible ? "Modifier le vinyle" : "Nouveau vinyle"}</h2>
      <input type="hidden" name="code" value={code} />
      {cible && <input type="hidden" name="id" value={cible.id} />}
      <input type="hidden" name="pochette" value={v.pochette} />
      <input type="hidden" name="mbid" value={v.mbid} />

      <div className="ajout-corps">
        <div className="photo">
          <Pochette src={v.pochette || photo} alt="Pochette" />
          <input ref={champPhoto} type="file" accept="image/*" capture="environment" hidden onChange={photographier} />
          <button type="button" className="btn primary" onClick={() => champPhoto.current?.click()} disabled={lecture.enCours || enCours}>
            {lecture.enCours ? "Analyse…" : "📷 Prendre en photo"}
          </button>
          {photo && officielle && (
            <button type="button" className="btn petit" onClick={() => setV({ ...v, pochette: photo })}>Garder ma photo</button>
          )}
        </div>

        <div className="grille">
          <p className={lecture.erreur ? "lecture erreur" : "lecture"} role="status" aria-live="polite">
            {lecture.msg || "Photographie la pochette : le titre, l’artiste et l’année se remplissent tout seuls."}
          </p>
          <label>Artiste *<input name="artiste" required value={v.artiste} onChange={maj("artiste")} /></label>
          <label>Titre *<input name="titre" required value={v.titre} onChange={maj("titre")} /></label>
          <label>Année<input name="annee" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="AAAA" value={v.annee} onChange={maj("annee")} /></label>
          <label>Genre<input name="genre" list="genres" value={v.genre} onChange={maj("genre")} /></label>
          <label>Label<input name="label" value={v.label} onChange={maj("label")} /></label>
          <label className="large">Notes<input name="notes" placeholder="Édition, état, pressage…" value={v.notes} onChange={maj("notes")} /></label>
        </div>
      </div>
      <datalist id="genres">{GENRES.map((g) => <option key={g} value={g} />)}</datalist>

      <div className="actions">
        <button type="submit" className="btn primary" disabled={enCours || lecture.enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" className="btn" onClick={onFermer} disabled={enCours}>Fermer</button>
        <p className={etat?.erreur ? "msg erreur" : "msg"} role="status">
          {etat?.erreur || (etat?.ok ? `Vinyle ${etat.modif ? "modifié" : "ajouté"}. Visible après rechargement une fois le site redéployé (~1 min).` : "")}
        </p>
      </div>
    </form>
  );
}

const TRIS = {
  ajout: ["Derniers ajouts", (a, b) => (b.ajoute || "").localeCompare(a.ajoute || "")],
  artiste: ["Artiste A → Z", (a, b) => a.artiste.localeCompare(b.artiste, "fr") || (a.annee || "").localeCompare(b.annee || "")],
  recent: ["Année (récent)", (a, b) => (b.annee || "0").localeCompare(a.annee || "0")],
  ancien: ["Année (ancien)", (a, b) => (a.annee || "9999").localeCompare(b.annee || "9999")],
};

export default function Vinyles({ data: initial }) {
  const [data, setData] = useState(initial);
  const [ouvert, setOuvert] = useState(null); // null, { nouveau: true } ou un vinyle
  const [genre, setGenre] = useState("tous");
  const [tri, setTri] = useState("ajout");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [saisie, setSaisie] = useState(null); // null = champ du code fermé
  const [verif, setVerif] = useState(false);

  // Code déjà saisi sur cet appareil : on vérifie qu'il est toujours bon.
  useEffect(() => {
    const c = stockage.lire();
    if (!c) return;
    verifierCode(c).then((r) => {
      if (r.ok) { setCode(c); setCanEdit(true); } else stockage.effacer();
    });
  }, []);

  async function deverrouiller(e) {
    e.preventDefault();
    setVerif(true);
    const r = await verifierCode(saisie);
    setVerif(false);
    if (!r.ok) return setMsg(r.erreur);
    stockage.ecrire(saisie);
    setCode(saisie); setCanEdit(true); setSaisie(null); setMsg("");
  }

  function verrouiller() {
    stockage.effacer();
    setCode(""); setCanEdit(false); setOuvert(null); setMsg("");
  }

  const artistes = new Set(data.map((v) => v.artiste.toLowerCase())).size;
  const decennies = {};
  data.forEach((v) => { if (v.annee) { const d = v.annee.slice(0, 3) + "0"; decennies[d] = (decennies[d] || 0) + 1; } });
  const decennie = Object.entries(decennies).sort((a, b) => b[1] - a[1])[0]?.[0];
  const plusAncien = data.map((v) => v.annee).filter(Boolean).sort()[0];

  const counts = { tous: data.length };
  data.forEach((v) => { if (v.genre) counts[v.genre] = (counts[v.genre] || 0) + 1; });
  const chips = ["tous", ...Object.keys(counts).filter((k) => k !== "tous").sort((a, b) => a.localeCompare(b, "fr"))];

  const recherche = q.trim().toLowerCase();
  const liste = data
    .filter((v) => genre === "tous" || v.genre === genre)
    .filter((v) => !recherche || [v.artiste, v.titre, v.label, v.annee, v.notes].join(" ").toLowerCase().includes(recherche))
    .sort(TRIS[tri][1]);

  async function supprimer(v) {
    if (!confirm(`Retirer « ${v.titre} » de ta collection ?`)) return;
    const r = await retirerVinyle(v.id, code);
    if (r.erreur) return setMsg(r.erreur);
    setData(r.data);
    setOuvert(null);
    setMsg(`« ${v.titre} » retiré de la collection.`);
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Mes vinyles</h1>
          <p>Suivi de ma collection de disques.</p>
        </div>
        <div className="entete-actions">
          {canEdit ? (
            <>
              {!ouvert && <button type="button" className="btn primary" onClick={() => setOuvert({ nouveau: true })}>+ Ajouter un vinyle</button>}
              <button type="button" className="btn" onClick={verrouiller}>Verrouiller</button>
            </>
          ) : (
            <button type="button" className="btn" aria-expanded={saisie !== null} onClick={() => { setSaisie(saisie === null ? "" : null); setMsg(""); }}>Modifier</button>
          )}
        </div>
      </header>

      {saisie !== null && !canEdit && (
        <form className="code" onSubmit={deverrouiller}>
          <input type="password" placeholder="Code d’accès" aria-label="Code d’accès" autoComplete="current-password"
            value={saisie} onChange={(e) => setSaisie(e.target.value)} autoFocus required />
          <button type="submit" className="btn primary" disabled={verif}>{verif ? "Vérification…" : "Valider"}</button>
        </form>
      )}

      {ouvert && canEdit && (
        <>
          <Formulaire
            key={ouvert.nouveau ? "nouveau" : ouvert.id}
            cible={ouvert.nouveau ? null : ouvert}
            code={code}
            onEnregistre={(d, modif) => { setData(d); setMsg(""); if (modif) setOuvert(null); }}
            onFermer={() => setOuvert(null)}
          />
          {!ouvert.nouveau && (
            <p className="retirer"><button type="button" className="btn petit danger" onClick={() => supprimer(ouvert)}>Retirer ce vinyle de la collection</button></p>
          )}
        </>
      )}
      {msg && <p className="msg-global" role="status">{msg}</p>}

      <section className="stats" aria-label="Résumé">
        {[[data.length, "vinyles"], [artistes, "artistes"], [decennie ? `${decennie}s` : "—", "décennie favorite"], [plusAncien || "—", "le plus ancien"]].map(([n, l]) => (
          <div className="stat" key={l}><b>{n}</b><span>{l}</span></div>
        ))}
      </section>

      <div className="tools">
        <input type="search" placeholder="Rechercher un artiste, un album…" aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Trier" value={tri} onChange={(e) => setTri(e.target.value)}>
          {Object.entries(TRIS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {chips.length > 2 && (
          <div className="chips" role="group" aria-label="Filtrer par genre">
            {chips.map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={genre === k} onClick={() => setGenre(k)}>
                {k === "tous" ? "Tous" : k} ({counts[k]})
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="bac">
        {liste.map((v) => (
          <li key={v.id} className="disque">
            <Pochette src={v.pochette} alt={`Pochette de ${v.titre}`} />
            <div className="infos">
              <b>{v.titre}</b>
              <span>{v.artiste}</span>
              <small>{[v.annee, v.genre].filter(Boolean).join(" · ")}</small>
            </div>
            {canEdit && <button type="button" className="btn petit modif" title="Modifier" aria-label={`Modifier ${v.artiste} – ${v.titre}`}
              onClick={() => { setOuvert(v); setMsg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>✎</button>}
          </li>
        ))}
      </ul>
      <div className="empty" hidden={liste.length > 0}>
        {data.length ? "Aucun vinyle ne correspond à cette recherche." : "La collection est vide pour l’instant."}
      </div>
    </div>
  );
}
