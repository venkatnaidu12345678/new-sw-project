import React from "react";
import { Image } from "react-native";
import { getImageUri, isRemoteImageUrl } from "../../Utils/imageUpload";

/**
 * Renders local file URIs or Cloudinary HTTPS URLs.
 */
const RemoteImage = ({ source, style, resizeMode = "cover", ...props }) => {
  const uri =
    typeof source === "string"
      ? source
      : source?.uri || getImageUri(source);

  if (!uri) return null;

  const imageSource = isRemoteImageUrl(uri)
    ? { uri }
    : { uri };

  return (
    <Image
      source={imageSource}
      style={style}
      resizeMode={resizeMode}
      {...props}
    />
  );
};

export default RemoteImage;
