import { mount } from 'svelte';
import App from './ui/App.svelte';
import './ui/theme.css';

mount(App, { target: document.getElementById('app')! });
