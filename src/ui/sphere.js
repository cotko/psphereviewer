'use strict'

const XMP_KEY_MAP = {
  'GPano:FullPanoWidthPixels':           'full_width',
  'GPano:FullPanoHeightPixels':          'full_height',
  'GPano:CroppedAreaImageWidthPixels':   'cropped_width',
  'GPano:CroppedAreaImageHeightPixels':  'cropped_height',
  'GPano:CroppedAreaLeftPixels':         'cropped_x',
  'GPano:CroppedAreaTopPixels':          'cropped_y'
}

const xmp2photoSphereViewPanoSize = xmp =>
  _
    .chain(xmp)
    .pick(Object.keys(XMP_KEY_MAP))
    .map( (val, key) => [XMP_KEY_MAP[key], val] )
    .fromPairs()
    .value()

//http://photosphereviewer.net/js/sphere.js?20150926
export const sphereView = sources => {
  sources.selectedsphere$.subscribe( ss => {
    console.log('selected this', ss)

    if(!ss) return

    let pano_size = xmp2photoSphereViewPanoSize(_.get(ss, 'xmp.data'))
    console.log(pano_size)


    // pano_size:
    //full_width: parseInt(getAttribute(data, 'FullPanoWidthPixels')),
    //full_height: parseInt(getAttribute(data, 'FullPanoHeightPixels')),
    //cropped_width: parseInt(getAttribute(data, 'CroppedAreaImageWidthPixels')),
    //cropped_height: parseInt(getAttribute(data, 'CroppedAreaImageHeightPixels')),
    //cropped_x: parseInt(getAttribute(data, 'CroppedAreaLeftPixels')),
    //cropped_y: parseInt(getAttribute(data, 'CroppedAreaTopPixels')),

    //GPano:CroppedAreaImageHeightPixels
    //GPano:CroppedAreaImageWidthPixels
    //GPano:CroppedAreaLeftPixels
    //GPano:CroppedAreaTopPixels
    //GPano:FirstPhotoDate
    //GPano:FullPanoHeightPixels
    //GPano:FullPanoWidthPixels
    //GPano:LargestValidInteriorRectHeight
    //GPano:LargestValidInteriorRectLeft
    //GPano:LargestValidInteriorRectTop
    //GPano:LargestValidInteriorRectWidth
    //GPano:LastPhotoDate
    //GPano:PoseHeadingDegrees
    //GPano:ProjectionType
    //GPano:SourcePhotosCount
    //GPano:UsePanoramaViewer


    window.LASTSPHERE = new PhotoSphereViewer({
      pano_size,
      panorama: `file:///${ss.real_path || ss.path}`,
      container: sources.target,
      usexmpdata: false,
      navbar: true,
      autoload: true,
      rings: window.S_RINGS,
      segments: window.S_SEGMENTS,
      min_fov: 30,
      // this one should be max 50, otherwise
      // the view is pretty screwed (if > 60)
      max_fov: 50
    })
  })
}


