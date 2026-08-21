import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Stack, Accordion, AccordionSummary,
  AccordionDetails, TextField, InputAdornment, Button, Chip, Divider,
  Card, CardContent, CardActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  SupportAgent as SupportIcon,
  BugReport as BugIcon,
  School as TutorialIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  MenuBook as GuideIcon,
  AutoAwesome as AiIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import { getAllEntries, getCategories, searchKnowledgeBase } from '../../../services/knowledgeBaseService';

const guides = [
  {
    title: "Guide de démarrage rapide",
    description: "Les premières étapes pour configurer votre dépôt : création de compte, ajout de produits, paramétrage des prix.",
    icon: <TutorialIcon sx={{ fontSize: 40 }} color="primary" />,
    color: "#e3f2fd",
  },
  {
    title: "Gestion des stocks",
    description: "Comment gérer vos entrées et sorties de stock, faire des inventaires, et suivre les mouvements de casiers.",
    icon: <GuideIcon sx={{ fontSize: 40 }} color="success" />,
    color: "#e8f5e9",
  },
  {
    title: "Ventes et encaissements",
    description: "Maîtrisez l'interface de vente, les différents modes de paiement, la gestion des crédits clients et les reçus.",
    icon: <HelpIcon sx={{ fontSize: 40 }} color="warning" />,
    color: "#fff3e0",
  },
  {
    title: "Livraisons et GPS",
    description: "Organisez vos livraisons, assignez des livreurs, suivez les positions en temps réel et gérez les confirmations OTP.",
    icon: <GuideIcon sx={{ fontSize: 40 }} color="info" />,
    color: "#e3f2fd",
  }
];

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(false);

  const allEntries = useMemo(() => getAllEntries(), []);
  const categories = useMemo(() => getCategories(), []);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return allEntries;
    return searchKnowledgeBase(search, 50);
  }, [search, allEntries]);

  const handleFaqChange = (panel) => (event, isExpanded) => {
    setExpandedFaq(isExpanded ? panel : false);
  };

  const groupedByCategory = useMemo(() => {
    const groups = {};
    for (const entry of filteredEntries) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  return (
    <PageContainer
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <HelpIcon sx={{ fontSize: 28, color: '#1976d2' }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Centre d'Aide
          </Typography>
          <Chip label="DOCS" color="primary" size="small" sx={{ fontWeight: 700 }} />
        </Stack>
      }
    >
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher dans la documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          <GuideIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Guides d'utilisation
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {guides.map((guide, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ borderRadius: 2, bgcolor: guide.color, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    {guide.icon}
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    {guide.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {guide.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" variant="text">
                    Lire le guide
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Foire Aux Questions (FAQ)
        </Typography>

        {categories.map((category) => {
          const entries = search ? groupedByCategory[category] : allEntries.filter(e => e.category === category);
          if (!entries || entries.length === 0) return null;
          return (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize', mb: 1, color: 'text.secondary' }}>
                {category}
              </Typography>
              <Paper sx={{ borderRadius: 2 }}>
                {entries.map((entry, index) => (
                  <Accordion
                    key={entry.id}
                    expanded={expandedFaq === entry.id}
                    onChange={handleFaqChange(entry.id)}
                    sx={{ '&:before': { display: 'none' }, boxShadow: 'none', borderBottom: index < entries.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: 600 }}>{entry.question}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography color="text.secondary" sx={{ mb: 1.5 }}>{entry.answer}</Typography>
                      {entry.path && (
                        <Button
                          size="small"
                          variant="contained"
                          endIcon={<OpenIcon />}
                          onClick={() => navigate(entry.path)}
                          sx={{
                            bgcolor: '#667eea',
                            '&:hover': { bgcolor: '#5a6fd6' },
                            textTransform: 'none',
                          }}
                        >
                          Ouvrir la page
                        </Button>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            </Box>
          );
        })}

        {filteredEntries.length === 0 && search && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              Aucun résultat trouvé pour "{search}"
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          <SupportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Besoin d'aide supplémentaire ?
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<WhatsAppIcon />}
              sx={{ py: 2, borderRadius: 2, borderColor: '#25D366', color: '#25D366', '&:hover': { borderColor: '#128C7E', bgcolor: '#f0faf0' } }}
              href="https://wa.me/2250708091011"
              target="_blank"
            >
              Support WhatsApp
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<EmailIcon />}
              sx={{ py: 2, borderRadius: 2 }}
              href="mailto:support@depotmanager.com"
            >
              Envoyer un email
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<BugIcon />}
              color="warning"
              sx={{ py: 2, borderRadius: 2 }}
            >
              Signaler un bug
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AiIcon />}
              sx={{ py: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              Assistant IA (Bientôt)
            </Button>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
}
