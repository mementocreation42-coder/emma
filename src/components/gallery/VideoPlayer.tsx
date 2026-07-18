"use client";

import { CldVideoPlayer } from "next-cloudinary";
import 'next-cloudinary/dist/cld-video-player.css';

interface VideoPlayerProps {
    src: string;
    width: number;
    height: number;
}

// Loaded via next/dynamic so video.js is only downloaded when a video is opened
export default function VideoPlayer({ src, width, height }: VideoPlayerProps) {
    return (
        <CldVideoPlayer
            width={width}
            height={height}
            src={src}
            colors={{
                accent: '#ffffff',
                base: '#000000',
                text: '#ffffff'
            }}
        />
    );
}
