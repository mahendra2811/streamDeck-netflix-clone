import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // firebase auth + react-router + framer-motion in one vendor chunk sits
    // just over the default 500kb warning threshold - not worth splitting
    // for an app this size where auth gates every screen anyway.
    chunkSizeWarningLimit: 600,
  },
})
