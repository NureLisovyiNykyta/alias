import book from '@/assets/book.png';
import dogs from '@/assets/dogs.png';
import pokemonGo from '@/assets/pokemonGo.png';
import maps from '@/assets/maps.png';
import map1 from '@/assets/map1.png';
import map2 from '@/assets/map2.png';
import { Link } from "react-router-dom";
import CardPack from "@/components/cards/CardPack.jsx";
import MapPreviewCard from "@/components/cards/MapPreviewCard.jsx";

export const CARD_PACKS = [
  {
    id: 1,
    title: 'Pokemon Go',
    image: pokemonGo,
    description: 'I decided to create 300+ cards for you Alias evenings about Pokemons. My deck doesn’t include Kanto region as I hate it. Have fun!',
    savedBy: '144,789',
    positions: '345',
    rating: '4.89'
  },
  {
    id: 2,
    title: 'Dogs',
    image: dogs,
    description: 'Dogs are often called "man\'s best friend" for a reason. As the first species ever domesticated, they’ve evolved alongside humans for thousands of years, moving from wild hunters to beloved couch potatoes and loyal protectors.',
    savedBy: '144,789',
    positions: '345',
    rating: '4.89'
  }
];

const MAPS = [
  {
    id: 1,
    title: 'Abstract map',
    image: map1,
    dimensions: "10x6",
    basedOn: "Pokemon Go",
    description: "This map is perfect for Alias-beginners."
  },
  {
    id: 2,
    title: 'Funny cartoons',
    image: map2,
    dimensions: "10x6",
    basedOn: "Pokemon Go",
    description: "This map is perfect for Alias-beginners."
  },
];

const PACKS_LINK = '/gallery/packs';

const InfoCards = () => {
  return (
    <div className='w-full flex flex-col gap-8'>
      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-4'>
          <img className='w-25 h-20 object-cover' src={book} alt="Book"/>
          <h1 className='text-h1'>Discover new community card packs</h1>
          <span className='text-label font-noto text-text-label'>updated weekly</span>
        </div>

        <Link
          to={PACKS_LINK}
          className='text-label font-noto text-brand-500'
        >
          Browse the gallery →
        </Link>
      </div>

      <ul className='flex flex-col gap-8 w-full'>
        {CARD_PACKS.map((pack) => (
          <CardPack key={pack.id} pack={pack}/>
        ))}
      </ul>

      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-4'>
          <img className='w-25 h-20 object-cover' src={maps} alt="Maps"/>
          <h1 className='text-h1'>Features public maps</h1>
          <span className='text-label font-noto text-text-label'>updated daily</span>
        </div>

        <button className='text-label font-noto text-brand-500'>
          Browse the gallery →
        </button>
      </div>

      <ul className='flex flex-col gap-5 w-full'>
        {MAPS.map(map => (
          <MapPreviewCard map={map}/>
        ))}
      </ul>
    </div>
  );
};

export default InfoCards;
