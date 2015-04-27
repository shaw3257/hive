#!/usr/bin/env ruby

Dir.chdir('app/assets/images')
    
image_names = %w(
  white_queen.png
  white_ant.png
  white_grasshopper.png
  white_beetle.png
  white_spider.png
  black_queen.png
  black_ant.png
  black_grasshopper.png
  black_beetle.png
  black_spider.png
)

dims = '175!x152!\<'

image_names.each do |name|
  cmd = "convert #{name} -bordercolor 'rgba(0,0,0,0.0)' -border 50 -rotate 90 -trim -resize #{dims} #{name}"
  `#{cmd}`
  puts `file new_#{name}`
end
