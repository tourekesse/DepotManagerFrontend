import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fab, Dialog, DialogTitle, DialogContent, TextField, Box, Typography,
  Button, Chip, IconButton, InputAdornment, Paper, Stack, Avatar,
  CircularProgress, Grow
} from '@mui/material';
import {
  AutoAwesome as AiIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import { searchKnowledgeBase } from '../../services/knowledgeBaseService';

let msgId = 0;

const makeLi = (role, text) => ({ id: ++msgId, role, text });
const makeLui = (answer, kb) => ({ id: ++msgId, role: 'bot', text: { answer, kb } });

export default function SitaAssistant() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  const ask = async (value, intent) => {
    const text = (value ?? query).trim();
    if (!text || asking) return;

    setQuery('');
    setMessages((prev) => [...prev, makeLi('user', text)]);
    setAsking(true);

    try {
      const kb = intent ? [] : searchKnowledgeBase(text, 3);
      const response = await privateApi.post('/api/assistant/sita', { message: text, intent: intent || '' });
      const answer = response.data?.answer || 'Je n\'ai pas trouvé de réponse.';
      setMessages((prev) => [...prev, makeLui(answer, kb)]);
    } catch (error) {
      setMessages((prev) => [...prev, makeLui('Une erreur est survenue. Réessayez dans un instant.', [])]);
    } finally {
      setAsking(false);
    }
  };

  const handleOpenPage = (path) => {
    if (path) {
      navigate(path);
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setMessages([]);
    setAsking(false);
  };

  const suggestions = ["Comment créer un produit ?", "Comment passer une commande ?", "Comment suivre une livraison ?"];

  const quickQuestions = [
    {
      theme: 'Produits & Stock',
      items: [
        { label: "Quels sont mes produits en stock ?", intent: "stock_produits" },
        { label: "Quels produits ont un stock bas ?", intent: "stock_bas" },
        { label: "Trouver un produit", intent: "recherche_produit" },
      ],
    },
    {
      theme: 'Mes ventes',
      items: [
        { label: "Ventes du jour", intent: "nb_ventes_jour" },
        { label: "Chiffre d'affaires du jour", intent: "ca_jour" },
        { label: "Mes produits les plus vendus", intent: "top_produits" },
        { label: "Chiffre d'affaires sur une période", intent: "ca_periode" },
      ],
    },
    {
      theme: 'Mes clients',
      items: [
        { label: "Combien de clients ?", intent: "nb_clients" },
        { label: "Mes meilleurs clients", intent: "top_clients" },
        { label: "Clients qui me doivent", intent: "dettes_clients" },
      ],
    },
    {
      theme: 'Trésorerie',
      items: [
        { label: "Caisse du jour", intent: "caisse_jour" },
      ],
    },
  ];

  return (
    <>
      <Grow in={!open}>
        <Fab
          color="primary"
          aria-label="assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f96 100%)',
            },
            width: 56,
            height: 56,
          }}
        >
          <AiIcon sx={{ fontSize: 28 }} />
        </Fab>
      </Grow>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            position: 'fixed',
            bottom: 24,
            right: 24,
            m: 0,
            width: 400,
            maxHeight: 560,
            height: 'calc(100vh - 120px)',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        hideBackdrop
        disableScrollLock
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          m: 0,
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
              <BotIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Sita</Typography>
              <Typography sx={{ fontSize: 11, opacity: 0.8 }}>Assistante Depot Manager</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form"
          onSubmit={(e) => { e.preventDefault(); ask(); }}
          sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Posez une question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            inputRef={inputRef}
            variant="outlined"
            sx={{ bgcolor: 'white', borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#667eea', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" size="small" disabled={asking} sx={{ color: '#667eea' }}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <DialogContent ref={listRef} sx={{ p: 2, overflow: 'auto', flex: 1, bgcolor: '#f9f9fb' }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AiIcon sx={{ fontSize: 48, color: '#667eea', mb: 1, opacity: 0.5 }} />
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Posez une question sur l'utilisation<br />de Depot Manager
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {suggestions.map((suggestion) => (
                  <Chip
                    key={suggestion}
                    label={suggestion}
                    onClick={() => ask(suggestion)}
                    variant="outlined"
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f0f0ff' } }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Box sx={{ mb: 2, bgcolor: '#ffffff', borderRadius: 2, p: 1.5, border: '1px solid #e7e7f2' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#667eea', mb: 1 }}>
              Questions sur mes données (un clic)
            </Typography>
            {quickQuestions.map((group) => (
              <Box key={group.theme} sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#999' }}>{group.theme}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                  {group.items.map((item) => (
                    <Chip
                      key={item.intent}
                      label={item.label}
                      size="small"
                      onClick={() => ask(item.label, item.intent)}
                      variant="outlined"
                      color="primary"
                      sx={{ mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: '#f0f0ff' } }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>

          <Stack spacing={1.5}>
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
maxWidth: '80%',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <span style={{ filter: 'none' }}>{msg.text}</span>
                  </Paper>
                </Box>
              ) : (
                <Stack key={msg.id} spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: '#667eea', width: 24, height: 24, mr: 1, fontSize: 13 }}>
                      <BotIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: 'white',
                        maxWidth: '85%',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.text?.answer}
                    </Paper>
                  </Box>
                  {msg.text?.kb?.length > 0 && (
                    <Box sx={{ pl: 4 }}>
                      <Stack spacing={1}>
                        {msg.text.kb.map((result) => (
                          <Paper
                            key={result.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              borderLeft: 4,
                              borderColor: '#a78bfa',
                              bgcolor: '#ffffff',
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#333' }}>
                              {result.question}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {result.path && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  endIcon={<OpenIcon />}
                                  onClick={() => handleOpenPage(result.path)}
                                  sx={{
                                    bgcolor: '#667eea',
                                    '&:hover': { bgcolor: '#5a6fd6' },
                                    textTransform: 'none',
                                    fontSize: 12,
                                  }}
                                >
                                  Ouvrir la page
                                </Button>
                              )}
                              <Chip label={result.category} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )
            )}

            {asking && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#667eea', width: 24, height: 24, mr: 1, fontSize: 13 }}>
                  <BotIcon sx={{ fontSize: 14 }} />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CircularProgress size={12} />
                  <Typography variant="caption" color="text.secondary">Sita réfléchit...</Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}