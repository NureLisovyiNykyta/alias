import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import RowNavigation from "@/components/nav/RowNavigation.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import { Button } from "@/components/buttons/Button.jsx";
import { usePackQuery, usePackCardsQuery, useDeletePackQuery } from "@/api/card-packs";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import ConfirmWindow from "@/components/modals/ConfirmWindow.jsx";
import star from '@/assets/star.svg';
import { formatPackDate } from "@/utils/parseTime.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { parseErrors } from "@/utils/parseErrors.js";
import mapPreview from "@/assets/mapPreview.svg";

const CardPackPreview = () => {
  const { id: packId } = useParams();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: pack, isLoading: isPackLoading } = usePackQuery(packId);
  const { data: serverCards, isLoading: isCardsLoading } = usePackCardsQuery(packId);
  const { showNotification } = useNotification();
  const { user: me } = useAuth();

  const [words, setWords] = useState([]);

  const { mutate: deletePack, isPending: isDeleting } = useDeletePackQuery({
    onSuccess: () => {
      showNotification({
        title: "Card Pack Deleted",
        message: `Card pack was successfully deleted.`,
        isSuccess: true,
      });
      setIsConfirmOpen(false);
      navigate('/gallery/packs');
    },
    onError: (error) => {
      console.log(error)
      showNotification({
        title: "Error occurred",
        message: `Failed to delete card pack. ${parseErrors(error.response?.data)}`,
        isSuccess: false,
      });
      setIsConfirmOpen(false);
    },
  });

  useEffect(() => {
    if (serverCards) {
      const extractedWords = serverCards
        .map(card => ({
          id: card.id,
          text: card.content?.text || card.content || ''
        }))
        .filter(w => w.text);
      setWords(extractedWords);
    }
  }, [serverCards]);

  const handleExport = () => {
    const textOnlyArray = words.map(w => w.text);
    navigator.clipboard.writeText(textOnlyArray.join(', '));
    showNotification({
      title: "Copied!",
      message: "Word list copied to clipboard.",
      isSuccess: true,
    });
  };

  const navLinks = [
    { path: "/", label: "Main Page", id: 1 },
    { label: "Card pack preview", id: 2 },
  ];

  if (isPackLoading || isCardsLoading) {
    return (
      <main className="flex items-center justify-center w-full h-full gap-5">
        <Spinner size="lg" />
        <h2 className='text-h2 text-text-label'>Loading Pack Info</h2>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full gap-8 relative">
      <RowNavigation links={navLinks} />

      <div className="flex flex-col w-full gap-4">
        <h1 className="text-h1">Card pack preview</h1>
        <span className="text-label text-text-label font-noto">
          Explore specialized data sets. Each pack contains unique attributes and values for your custom decks.
        </span>
      </div>

      <div className='flex items-center gap-5 py-6 rounded-[12px] w-full h-[320px]'>
        {pack?.cover_url ?
          <img
            className='w-[420px] h-[270px] rounded-[12px] border border-text-label object-cover shrink-0'
            src={pack?.cover_url}
            alt='Map Image'
          /> :
          <div className='w-[420px] h-[270px] rounded-[12px] border border-text-label shrink-0 flex flex-col items-center justify-center gap-2'>
            <img src={mapPreview} alt="Map Template"/>
            <span className='text-label text-text-label'>No Image Selected</span>
          </div>
        }

        <div className='flex flex-col gap-4'>
          <h2 className='text-h1'>{pack?.name}</h2>

          <div className='grid grid-cols-3 gap-y-8 gap-x-10 max-w-[700px]'>
            <div className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Created</span>
              <p className='font-noto text-p'>{formatPackDate(pack?.created_at)}</p>
            </div>

            <div className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Finished</span>
              <p className='font-noto text-p'>{pack?.finished_games_count || 0} games</p>
            </div>

            <div className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Rating</span>
              <div className='flex items-center gap-2'>
                <img src={star} alt="Star rating" />
                <p className='font-noto text-p'>{pack?.rating_average || '0.0'}</p>
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Count of fields</span>
              <p className='font-noto text-p'>{words.length}</p>
            </div>

            <div className='flex flex-col gap-2'>
              <span className='text-label text-text-label font-noto'>Author</span>
              {!pack?.author?.username.startsWith('deleted') ?
                <Link
                  to={`/user/${pack?.author?.username}`}
                  className="flex items-center gap-2 hover:text-brand-500 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-500 overflow-hidden flex items-center justify-center">
                    {pack?.author?.avatar_url ? (
                      <img src={pack.author.avatar_url} alt="author" className="w-full h-full object-cover shrink-0" />
                    ) : (
                      <span className="text-[10px] text-white font-bold shrink-0">{pack?.author?.nickname?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <p className='font-noto text-p'>{pack?.author?.nickname || 'System'}</p>
                </Link> :
                <div
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-500 overflow-hidden flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold shrink-0">{pack?.author?.nickname?.[0]?.toUpperCase()}</span>
                  </div>
                  <p className='font-noto text-p'>{pack?.author?.nickname || 'System'}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center w-full p-4 gap-4 flex-wrap overflow-hidden bg-surface rounded-[12px] border border-text-label min-h-[120px]">
        {words.length === 0 ? (
          <div className="w-full flex items-center justify-center p-4 text-text-label font-noto text-p">
            The list is empty
          </div>
        ) : (
          words.map((wordObj, index) => (
            <div
              key={wordObj.id || `word-${index}`}
              className='flex items-center h-12 border border-text-label py-[10px] px-4 rounded-[8px] bg-white shrink-0'
            >
              <span className='text-label font-noto'>{wordObj.text}</span>
            </div>
          ))
        )}
      </div>

      <div className={`w-full flex items-center gap-3 ${me?.id === pack?.author_id ? 'justify-between' : 'justify-end'}`}>
        {me?.id === pack?.author_id && (
          <div className="flex items-center justify-between w-full">
            <Button
              as={Link}
              to={`/edit/card-pack/${pack.id}`}
              variant='tertiary'
            >
              Edit Card Pack
            </Button>

            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isDeleting}
            >
              Delete Card Pack
            </Button>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={words.length === 0}
          className='end-auto'
        >
          Export
        </Button>
      </div>

      <ConfirmWindow
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Delete Card Pack"
        label="Are you sure you want to delete this card pack?"
        paragraph="This action cannot be undone and will permanently remove the pack."
        onSuccess={() => deletePack({ packId })}
      />
    </main>
  );
};

export default CardPackPreview;
