import React, { useEffect, useState } from "react";
import axios from "../api/axios";

export default function LivreurPage() {
  const [livreurs, setLivreurs] = useState([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchLivreurs();
  }, []);

  const fetchLivreurs = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/livreurs");
      setLivreurs(res.data);
    } catch (err) {
      setError("Erreur lors du chargement des livreurs");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/utilisateur/creer-livreur", form);
      setSuccess("Livreur ajouté avec succès");
      setForm({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "" });
      fetchLivreurs();
    } catch (err) {
      setError("Erreur lors de l'ajout du livreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Gestion des livreurs</h2>
      <form onSubmit={handleSubmit}>
        <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Prénom" required />
        <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Nom" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" />
        <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="Téléphone" />
        <input name="password" value={form.password} onChange={handleChange} placeholder="Mot de passe" type="password" required />
        <button type="submit" disabled={loading}>Ajouter</button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {success && <div style={{ color: "green" }}>{success}</div>}
      <ul>
        {livreurs.map((l) => (
          <li key={l.id}>{l.firstName} {l.lastName} ({l.email}) {l.phoneNumber}</li>
        ))}
      </ul>
    </div>
  );
}
