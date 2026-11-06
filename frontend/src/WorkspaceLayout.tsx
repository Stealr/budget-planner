import { Link, NavLink, Outlet } from 'react-router';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { closeMobileMenu, openMobileMenu } from './store/navigationSlice';

const sections = [
  { path: '/', label: 'Дашборд' },
  { path: '/transactions', label: 'Операции' },
  { path: '/categories', label: 'Категории' },
  { path: '/limits', label: 'Лимиты' },
  { path: '/settings', label: 'Настройки' },
];

const navigationWidth = 208;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Box component="nav" aria-label="Разделы личного кабинета" sx={{ px: 2, py: 2 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
        Личный кабинет
      </Typography>
      <List disablePadding>
        {sections.map(({ path, label }) => (
          <ListItemButton
            key={path}
            component={NavLink}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            sx={{
              '&[aria-current=page]': {
                color: 'primary.main',
                bgcolor: 'action.selected',
              },
            }}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export default function WorkspaceLayout() {
  const menuOpen = useAppSelector((state) => state.navigation.mobileMenuOpen);
  const dispatch = useAppDispatch();
  const closeMenu = () => dispatch(closeMobileMenu());

  return (
    <Stack sx={{ minHeight: '100dvh' }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Typography
            component={Link}
            to="/"
            color="primary.main"
            sx={{ fontSize: '1.125rem', fontWeight: 800, textDecoration: 'none' }}
          >
            СтудБюджет
          </Typography>
          <Button component={Link} to="/login" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            Вход
          </Button>
          <IconButton
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => dispatch(openMobileMenu())}
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        sx={{ display: { xs: 'block', sm: 'none' } }}
        slotProps={{ paper: { sx: { width: navigationWidth } } }}
      >
        <Navigation onNavigate={closeMenu} />
        <Button component={Link} to="/login" onClick={closeMenu} sx={{ mx: 2 }}>
          Вход
        </Button>
      </Drawer>
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: navigationWidth,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Navigation />
        </Box>
        <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Stack>
  );
}
