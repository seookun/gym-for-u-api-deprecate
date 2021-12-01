import 'reflect-metadata';
import App from '@/providers/App';

(async () => {
  // Load Configuration
  await App.loadConfiguration();

  // Load Database
  await App.loadDatabase();

  // Load Express Server
  await App.loadExpress();
})();
