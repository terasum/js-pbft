const script = 
`function fab(n)
  if n == 1 then
    return 1
  elseif n == 2 then 
    return 1
  end
  return fab(n - 1) + fab(n - 2)
end

print(fab(5))
`

module.exports = script;