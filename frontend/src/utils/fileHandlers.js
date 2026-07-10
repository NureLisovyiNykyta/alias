export const handleFileSelect = (event, setImageSrc, setIsCropperOpen) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  }
};
