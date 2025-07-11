import { Box,Text } from "ink";
import Spinner from "ink-spinner";
import { PrimaryColor } from "../utils/constant.js";

const LoadingDot = ({text}:any) => {
return (
    <Box alignItems="center">
    <Text color={PrimaryColor}>
      <Spinner type="dots"/>
    </Text>
    <Text color="gray"> {text}...</Text>
  </Box>
);
}


export default LoadingDot;