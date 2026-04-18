// src/pages/Register.jsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  InputAdornment,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";

export default function Register() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card sx={{ maxWidth: 420, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="DepotManager Logo"
              sx={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                boxShadow: '0 8px 24px rgba(25, 118, 210, 0.25)',
                mx: 'auto',
                mb: 2,
              }}
            />
          </Box>
          <Typography variant="h4" fontWeight={700} mb={1} textAlign="center">
            Register
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            Create your account
          </Typography>

          <Box component="form">
            {/* Username */}
            <TextField
              fullWidth
              placeholder="Username"
              autoComplete="username"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Email */}
            <TextField
              fullWidth
              placeholder="Email"
              autoComplete="email"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password */}
            <TextField
              fullWidth
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Repeat Password */}
            <TextField
              fullWidth
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              color="success"
              fullWidth
              sx={{ py: 1.2, fontWeight: 600 }}
            >
              Create Account
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
