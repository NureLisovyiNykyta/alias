import RowNavigation from "@/components/nav/RowNavigation.jsx";
import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/buttons/Button.jsx";
import cross from '@/assets/smallCross.svg';
import WordInput from "@/components/inputs/WordInput.jsx";
import WordImportForm from "@/components/inputs/WordImportForm.jsx";
import Spinner from "@/components/layouts/Spinner.jsx";
import {
  usePackCardsQuery,
  useBulkSyncCardsMutation,
  usePackQuery,
  useActivatePackMutation,
  usePublishPackMutation
} from "@/api/card-packs";
import { useNotification } from "@/contexts/NotificationContext.jsx";
import { useQueryClient } from '@tanstack/react-query';

const WordsEditor = () => {
  const { id: packId } = useParams();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);
  const [words, setWords] = useState([]);
  const [originalWords, setOriginalWords] = useState([]);

  const { data: packData } = usePackQuery(packId);
  const { data: serverCards, isLoading: isCardsLoading } = usePackCardsQuery(packId);

  useEffect(() => {
    if (serverCards) {
      const extractedWords = serverCards
        .map(card => ({
          id: card.id,
          text: card.content?.text || card.content || ''
        }))
        .filter(w => w.text);

      setWords(extractedWords);
      setOriginalWords(extractedWords);
    }
  }, [serverCards]);

  const { mutate: syncCards, isPending: isSaving } = useBulkSyncCardsMutation({
    onSuccess: () => {
      setOriginalWords(words);
      showNotification({
        title: "Success",
        message: "Card pack vocabulary has been updated.",
        isSuccess: true,
      });
      queryClient.invalidateQueries(['packCards', packId]);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to save the vocabulary.",
        isSuccess: false,
      });
    }
  });

  const { mutate: activatePack, isPending: isActivating } = useActivatePackMutation({
    onSuccess: () => {
      showNotification({
        title: "Pack Activated",
        message: "Your pack is now active.",
        isSuccess: true,
      });
      queryClient.invalidateQueries(['pack', packId]);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to activate the pack.",
        isSuccess: false,
      });
    }
  });

  const { mutate: publishPack, isPending: isPublishing } = usePublishPackMutation({
    onSuccess: () => {
      showNotification({
        title: "Pack Published",
        message: "Your pack is now public.",
        isSuccess: true,
      });
      queryClient.invalidateQueries(['pack', packId]);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to publish the pack.",
        isSuccess: false,
      });
    }
  });

  const handleAddWord = (newText) => {
    if (!words.some(w => w.text === newText)) {
      setWords([...words, { text: newText }]);
    }
  };

  const handleRemoveWord = (wordObjToRemove) => {
    setWords(words.filter(w => w.text !== wordObjToRemove.text));
  };

  const handleImportWords = (importedStrings) => {
    const newWordObjects = importedStrings
      .filter(str => !words.some(w => w.text === str))
      .map(str => ({ text: str }));

    setWords([...words, ...newWordObjects]);
  };

  const handleExport = () => {
    const textOnlyArray = words.map(w => w.text);
    navigator.clipboard.writeText(textOnlyArray.join(', '));
    showNotification({
      title: "Copied!",
      message: "Word list copied to clipboard.",
      isSuccess: true,
    });
  };

  const handleSave = () => {
    const payloadCards = words.map(w => {
      const cardPayload = { content: { text: w.text } };
      if (w.id) {
        cardPayload.id = w.id;
      }
      return cardPayload;
    });

    syncCards({ packId, cards: payloadCards });
  };

  const navLinks = [
    { id: 1, label: 'Main Page', path: '/' },
    { id: 2, label: 'Edit Card Pack Words', path: null }
  ];

  const displayedWords = showAllWords ? words : words.slice(0, 20);
  const hasChanges = JSON.stringify(words) !== JSON.stringify(originalWords);
  const canSave = hasChanges && words.length >= 2 && !isSaving && !isCardsLoading;

  const isDraft = packData?.status?.toUpperCase() === 'DRAFT';
  const isActivePrivate = packData?.status?.toUpperCase() === 'ACTIVE' && !packData?.is_public;

  return (
    <div className='flex flex-col w-full gap-8'>
      <RowNavigation links={navLinks}/>

      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-h1">Edit <b>{packData?.name}</b> Card Pack Words</h1>
          <Link
            to={`/edit/card-pack/${packId}`}
            className="text-brand-500 hover:text-brand-700 transition-colors text-label font-noto"
          >
            Edit the card-pack values →
          </Link>
        </div>
        <span className="text-label text-text-label font-noto w-full">
          Add the terms you want players to guess. Click the "+" or press Enter to add a new word.
        </span>
      </div>

      <div className="flex flex-col w-full rounded-[12px] border border-text-label bg-surface gap-4">
        <div className='flex flex-col w-full p-4 gap-2'>
          <h2 className='text-h2'>Card Vocabulary</h2>
          <span className="text-label text-text-label font-noto w-full">
            Add words or phrases that players will need to guess. At least 2 positions are required to save.
          </span>
        </div>

        <div className="flex items-center w-full p-4 gap-4 flex-wrap overflow-hidden min-h-[80px]">
          {isCardsLoading ? (
            <div className="w-full flex justify-center py-4">
              <Spinner size="md" />
            </div>
          ) : words.length === 0 ? (
            <div className="w-full flex items-center justify-center p-4 text-text-label font-noto text-p">
              The List is Empty
            </div>
          ) : (
            <>
              {displayedWords.map((wordObj, index) => (
                <div
                  key={wordObj.id || `new-${index}-${wordObj.text}`}
                  className='flex items-center h-12 border border-text-label gap-8 py-[10px] px-4 rounded-[8px] bg-white shrink-0'
                >
                  <span className='text-label font-noto'>{wordObj.text}</span>
                  <button
                    onClick={() => handleRemoveWord(wordObj)}
                    className='w-6 h-6 flex items-center justify-center hover:scale-115 transition-transform'
                  >
                    <img src={cross} alt="Remove Cross"/>
                  </button>
                </div>
              ))}

              {(words.length > 20 && !showAllWords) ? (
                <button
                  className='text-btn font-noto text-label flex items-center justify-center text-text-label hover:text-text transition-colors ml-2'
                  onClick={() => setShowAllWords(true)}
                >
                  Show all ({words.length})
                </button>
              ) : words.length > 20 ? (
                <button
                  className='text-btn font-noto text-label flex items-center justify-center text-text-label hover:text-text transition-colors ml-2'
                  onClick={() => setShowAllWords(false)}
                >
                  Show less
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className='w-full flex flex-col rounded-b-[12px] border-t border-text-label bg-surface-light p-4 gap-4'>
          <WordInput onAdd={handleAddWord} />
          <div className='w-full flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                variant='tertiary'
                onClick={handleExport}
                disabled={words.length === 0}
              >
                Export
              </Button>
              <span className='text-label text-text-label font-noto'>Copy the entire word list to your clipboard in one click</span>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='tertiary'
                onClick={() => setIsImportOpen(true)}
              >
                Import
              </Button>
              <span className='text-label text-text-label font-noto'>Open form to import new words</span>
            </div>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-between w-full'>
        <div className='flex items-center gap-3'>
          <Button
            variant='tertiary'
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? <Spinner size="sm" /> : 'Save'}
          </Button>
          <span className='text-label text-text-label font-noto'>Save the temporary result</span>
        </div>

        {isDraft && (
          <Button onClick={() => activatePack(packId)} disabled={isActivating}>
            {isActivating ? <Spinner size="sm" /> : 'Activate'}
          </Button>
        )}

        {isActivePrivate && (
          <Button onClick={() => publishPack(packId)} disabled={isPublishing}>
            {isPublishing ? <Spinner size="sm" /> : 'Publish'}
          </Button>
        )}
      </div>

      <WordImportForm
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onApply={handleImportWords}
      />
    </div>
  );
};

export default WordsEditor;
