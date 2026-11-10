import barrelTwist from '../assets/barrel-twist.webp';
import boxBraids from '../assets/box-braids.webp';
import blowout from '../assets/blowout.webp';
import finalizacao from '../assets/finalizacaoPower.webp';
import fulani from '../assets/fulani.webp';
import gipsy from '../assets/gispyBraids.webp';
import hidratacao from '../assets/hidratacao.webp';
import knotless from '../assets/knotlessBoxBraids.webp';
import lavagem from '../assets/Lavagem.webp';
import nago from '../assets/nagoDesenhada.webp';

const imageMap: Record<string, string> = {
  'barrel-twist': barrelTwist,
  'box-braids': boxBraids,
  'blowout': blowout,
  'finalizacao': finalizacao,
  'fulani': fulani,
  'gipsy': gipsy,
  'hidratacao': hidratacao,
  'knotless': knotless,
  'lavagem': lavagem,
  'nago': nago,
};

export function getServiceImage(key: string): string {
  if (!key) return boxBraids;
  // Se a string já for uma URL completa ou path externo, retorna ela mesma
  if (key.startsWith('http') || key.startsWith('/')) {
    return key;
  }
  return imageMap[key] || boxBraids;
}