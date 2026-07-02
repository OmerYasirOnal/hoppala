import './styles.css';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = 400;
canvas.height = 700;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#7ee08a';
ctx.fillRect(180, 330, 40, 40);
